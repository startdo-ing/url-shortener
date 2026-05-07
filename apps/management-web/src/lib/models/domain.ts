import { resolve4, resolve6, resolveCname } from "node:dns/promises"

import { createDb } from "@url-shortener/shared-db/client"
import type { Db } from "@url-shortener/shared-db/client"
import { domains, shortLinks } from "@url-shortener/shared-db/schema"
import { asc, count, desc, eq } from "drizzle-orm"

const DATABASE_PATH = process.env.DATABASE_PATH ?? "./dev.sqlite"
const HOST_PATTERN =
	/^(?=.{1,253}$)(?!-)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.(?!-)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/
const MISSING_RECORD_CODES = new Set([
	"ENODATA",
	"ENOTFOUND",
	"ESERVFAIL",
	"NOTFOUND"
])
const db = createDb(DATABASE_PATH)

export type DomainVerificationStatus = "pending" | "verified" | "failed"

export interface ManagedDomain {
	createdAt: string
	createdBy: string
	host: string
	id: string
	isActive: boolean
	isPrimary: boolean
	linkedShortLinkCount: number
	updatedAt: string
	verificationCheckedAt: string | null
	verificationError: string | null
	verificationStatus: DomainVerificationStatus
}

export interface DomainDnsResolver {
	resolve4(hostname: string): Promise<string[]>
	resolve6(hostname: string): Promise<string[]>
	resolveCname(hostname: string): Promise<string[]>
}

export interface DomainDnsVerificationConfig {
	expectedCnameTargets: string[]
	expectedIpv4Addresses: string[]
	expectedIpv6Addresses: string[]
}

interface CreateDomainOptions {
	allowLocalhost?: boolean
}

export function createDomainRepository(database: Db) {
	async function listDomains(): Promise<ManagedDomain[]> {
		const [domainRows, linkCounts] = await Promise.all([
			database
				.select()
				.from(domains)
				.orderBy(
					desc(domains.isPrimary),
					desc(domains.isActive),
					asc(domains.host)
				),
			database
				.select({ domainId: shortLinks.domainId, total: count() })
				.from(shortLinks)
				.groupBy(shortLinks.domainId)
		])

		const linkCountByDomainId = new Map(
			linkCounts.map((entry) => [entry.domainId, Number(entry.total ?? 0)])
		)

		return domainRows.map((domain) =>
			toManagedDomain(domain, linkCountByDomainId.get(domain.id) ?? 0)
		)
	}

	async function createDomain(
		hostInput: string,
		actorUserId: string,
		options: CreateDomainOptions = {}
	): Promise<ManagedDomain> {
		const host = normalizeHost(hostInput, options)
		const timestamp = new Date().toISOString()
		const domainId = crypto.randomUUID()

		try {
			await database.insert(domains).values({
				createdAt: timestamp,
				createdBy: actorUserId,
				host,
				id: domainId,
				isActive: true,
				isPrimary: false,
				updatedAt: timestamp,
				verificationCheckedAt: null,
				verificationError: null,
				verificationStatus: "pending"
			})
		} catch (error) {
			throw mapDomainWriteError(error)
		}

		const created = await findDomainById(domainId)
		if (created == null) {
			throw new Error("Domain was created but could not be reloaded.")
		}

		return created
	}

	async function setDomainActive(
		domainId: string,
		isActive: boolean
	): Promise<ManagedDomain> {
		await requireDomain(domainId)
		await database
			.update(domains)
			.set({
				isActive,
				updatedAt: new Date().toISOString()
			})
			.where(eq(domains.id, domainId))

		const updated = await findDomainById(domainId)
		if (updated == null) {
			throw new Error("Domain was updated but could not be reloaded.")
		}

		return updated
	}

	async function deleteDomain(domainId: string): Promise<void> {
		const existing = await requireDomain(domainId)
		if (existing.linkedShortLinkCount > 0) {
			throw new Error(
				"Delete the short links on this domain before removing it."
			)
		}

		await database.delete(domains).where(eq(domains.id, domainId))
	}

	async function verifyDomainDns(
		domainId: string,
		config: DomainDnsVerificationConfig = getDomainDnsVerificationConfig(),
		resolver: DomainDnsResolver = defaultDomainDnsResolver
	): Promise<ManagedDomain> {
		const domain = await requireDomain(domainId)
		assertVerificationConfigured(config)

		const checkedAt = new Date().toISOString()
		const records = await readDnsRecords(domain.host, resolver)
		const match = findMatchingDnsTarget(records, config)

		if (match) {
			await database
				.update(domains)
				.set({
					updatedAt: checkedAt,
					verificationCheckedAt: checkedAt,
					verificationError: null,
					verificationStatus: "verified"
				})
				.where(eq(domains.id, domainId))
		} else {
			await database
				.update(domains)
				.set({
					updatedAt: checkedAt,
					verificationCheckedAt: checkedAt,
					verificationError: buildVerificationFailure(records, config),
					verificationStatus: "failed"
				})
				.where(eq(domains.id, domainId))
		}

		const updated = await findDomainById(domainId)
		if (updated == null) {
			throw new Error(
				"Domain verification completed but could not be reloaded."
			)
		}

		return updated
	}

	async function findDomainById(
		domainId: string
	): Promise<ManagedDomain | null> {
		const row = await database.query.domains.findFirst({
			where: eq(domains.id, domainId)
		})
		if (row == null) {
			return null
		}

		const [{ total }] = await database
			.select({ total: count() })
			.from(shortLinks)
			.where(eq(shortLinks.domainId, domainId))

		return toManagedDomain(row, Number(total ?? 0))
	}

	async function requireDomain(domainId: string): Promise<ManagedDomain> {
		const domain = await findDomainById(domainId)
		if (domain == null) {
			throw new Error("Domain not found.")
		}

		return domain
	}

	async function setPrimaryDomain(domainId: string): Promise<ManagedDomain> {
		await requireDomain(domainId)
		const timestamp = new Date().toISOString()

		await database
			.update(domains)
			.set({ isPrimary: false, updatedAt: timestamp })
			.where(eq(domains.isPrimary, true))

		await database
			.update(domains)
			.set({ isPrimary: true, updatedAt: timestamp })
			.where(eq(domains.id, domainId))

		const updated = await findDomainById(domainId)
		if (updated == null) {
			throw new Error("Domain was updated but could not be reloaded.")
		}

		return updated
	}

	return {
		createDomain,
		deleteDomain,
		listDomains,
		setDomainActive,
		setPrimaryDomain,
		verifyDomainDns
	}
}

const repository = createDomainRepository(db)

export const createDomain = repository.createDomain
export const deleteDomain = repository.deleteDomain
export const listDomains = repository.listDomains
export const setDomainActive = repository.setDomainActive
export const setPrimaryDomain = repository.setPrimaryDomain
export const verifyDomainDns = repository.verifyDomainDns

const defaultDomainDnsResolver: DomainDnsResolver = {
	resolve4,
	resolve6,
	resolveCname
}

export function getDomainDnsVerificationConfig(): DomainDnsVerificationConfig {
	return {
		expectedCnameTargets: readListEnv("DOMAIN_VERIFICATION_CNAME_TARGETS").map(
			normalizeDnsName
		),
		expectedIpv4Addresses: readListEnv("DOMAIN_VERIFICATION_IPV4_ADDRESSES"),
		expectedIpv6Addresses: readListEnv("DOMAIN_VERIFICATION_IPV6_ADDRESSES")
	}
}

function assertVerificationConfigured(config: DomainDnsVerificationConfig) {
	if (
		config.expectedCnameTargets.length === 0 &&
		config.expectedIpv4Addresses.length === 0 &&
		config.expectedIpv6Addresses.length === 0
	) {
		throw new Error(
			"DNS verification is not configured. Set DOMAIN_VERIFICATION_CNAME_TARGETS and/or DOMAIN_VERIFICATION_IPV4_ADDRESSES or DOMAIN_VERIFICATION_IPV6_ADDRESSES."
		)
	}
}

function buildVerificationFailure(
	records: Awaited<ReturnType<typeof readDnsRecords>>,
	config: DomainDnsVerificationConfig
) {
	const expected = [
		config.expectedCnameTargets.length > 0
			? `CNAME ${config.expectedCnameTargets.join(", ")}`
			: null,
		config.expectedIpv4Addresses.length > 0
			? `A ${config.expectedIpv4Addresses.join(", ")}`
			: null,
		config.expectedIpv6Addresses.length > 0
			? `AAAA ${config.expectedIpv6Addresses.join(", ")}`
			: null
	]
		.filter(Boolean)
		.join(" or ")

	const actual = [
		records.cnames.length > 0 ? `CNAME ${records.cnames.join(", ")}` : null,
		records.ipv4.length > 0 ? `A ${records.ipv4.join(", ")}` : null,
		records.ipv6.length > 0 ? `AAAA ${records.ipv6.join(", ")}` : null
	]
		.filter(Boolean)
		.join("; ")

	return actual.length > 0
		? `Expected ${expected}. Found ${actual}.`
		: `Expected ${expected}. No matching DNS records were found.`
}

function findMatchingDnsTarget(
	records: Awaited<ReturnType<typeof readDnsRecords>>,
	config: DomainDnsVerificationConfig
) {
	return (
		records.cnames.some((cname) =>
			config.expectedCnameTargets.includes(normalizeDnsName(cname))
		) ||
		records.ipv4.some((address) =>
			config.expectedIpv4Addresses.includes(address)
		) ||
		records.ipv6.some((address) =>
			config.expectedIpv6Addresses.includes(address)
		)
	)
}

function mapDomainWriteError(error: unknown) {
	if (
		error instanceof Error &&
		(error.message.includes("domains_host_unique") ||
			error.message.includes("UNIQUE constraint failed: domains.host"))
	) {
		return new Error("That hostname is already configured.")
	}

	return error instanceof Error ? error : new Error("Domain write failed.")
}

function normalizeDnsName(value: string) {
	return value.trim().toLowerCase().replace(/\.$/, "")
}

function normalizeHost(hostInput: string, options: CreateDomainOptions = {}) {
	const rawHost = hostInput.trim().toLowerCase()
	if (rawHost.length === 0) {
		throw new Error("Domain host is required.")
	}

	if (rawHost.includes("://") || rawHost.includes("/")) {
		throw new Error("Domain must be a hostname only, without protocol or path.")
	}

	const host = normalizeDnsName(rawHost)
	if (host === "localhost") {
		if (options.allowLocalhost === true) {
			return host
		}

		throw new Error("Domain must be a valid hostname.")
	}

	if (!HOST_PATTERN.test(host)) {
		throw new Error("Domain must be a valid hostname.")
	}

	return host
}

async function readDnsRecords(hostname: string, resolver: DomainDnsResolver) {
	const [cnames, ipv4, ipv6] = await Promise.all([
		resolveDnsValues(() => resolver.resolveCname(hostname)),
		resolveDnsValues(() => resolver.resolve4(hostname)),
		resolveDnsValues(() => resolver.resolve6(hostname))
	])

	return {
		cnames: cnames.map(normalizeDnsName),
		ipv4,
		ipv6
	}
}

function readListEnv(name: string) {
	return (process.env[name] ?? "")
		.split(",")
		.map((value) => value.trim())
		.filter((value) => value.length > 0)
}

async function resolveDnsValues(resolve: () => Promise<string[]>) {
	try {
		return await resolve()
	} catch (error) {
		if (isMissingDnsRecordError(error)) {
			return []
		}

		throw new Error(
			error instanceof Error && error.message.length > 0
				? `DNS lookup failed: ${error.message}`
				: "DNS lookup failed."
		)
	}
}

function isMissingDnsRecordError(error: unknown) {
	if (!(error instanceof Error)) {
		return false
	}

	const code = (error as Error & { code?: string }).code
	return typeof code === "string" && MISSING_RECORD_CODES.has(code)
}

function toManagedDomain(
	domain: typeof domains.$inferSelect,
	linkedShortLinkCount: number
): ManagedDomain {
	return {
		createdAt: domain.createdAt,
		createdBy: domain.createdBy,
		host: domain.host,
		id: domain.id,
		isActive: domain.isActive,
		isPrimary: domain.isPrimary,
		linkedShortLinkCount,
		updatedAt: domain.updatedAt,
		verificationCheckedAt: domain.verificationCheckedAt,
		verificationError: domain.verificationError,
		verificationStatus: domain.verificationStatus
	}
}

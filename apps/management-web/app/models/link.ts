import { createDb } from "@url-shortener/shared-db/client"
import type { Db } from "@url-shortener/shared-db/client"
import { domains, shortLinks } from "@url-shortener/shared-db/schema"
import { and, asc, desc, eq, like, or } from "drizzle-orm"

const DATABASE_PATH = Bun.env.DATABASE_PATH ?? "./dev.sqlite"
const SLUG_PATTERN = /^[A-Za-z0-9_-]+$/
const ALLOWED_HTTP_CODES = new Set([301, 302, 307])
const db = createDb(DATABASE_PATH)

export interface ManagedShortLink {
	createdAt: string
	createdBy: string
	domainHost: string
	domainId: string
	expiresAt: string | null
	httpCode: 301 | 302 | 307
	id: string
	passwordHash: string | null
	slug: string
	status: "active" | "disabled"
	targetUrl: string
	updatedAt: string
}

export interface LinkFilters {
	domainId?: string
	query?: string
	status?: ManagedShortLink["status"]
}

export interface ShortLinkInput {
	domainId: string
	expiresAt?: string | null
	httpCode?: number
	slug: string
	status?: ManagedShortLink["status"]
	targetUrl: string
}

export interface LinkDomainOption {
	host: string
	id: string
	isActive: boolean
}

type ManagedShortLinkRow = Omit<ManagedShortLink, "httpCode"> & {
	httpCode: number
}

export function createLinkRepository(database: Db) {
	async function listLinkDomains(): Promise<LinkDomainOption[]> {
		return database
			.select({
				host: domains.host,
				id: domains.id,
				isActive: domains.isActive
			})
			.from(domains)
			.orderBy(asc(domains.host))
	}

	async function listLinks(
		filters: LinkFilters = {}
	): Promise<ManagedShortLink[]> {
		const conditions = buildFilterConditions(filters)
		const query = database
			.select({
				createdAt: shortLinks.createdAt,
				createdBy: shortLinks.createdBy,
				domainHost: domains.host,
				domainId: shortLinks.domainId,
				expiresAt: shortLinks.expiresAt,
				httpCode: shortLinks.httpCode,
				id: shortLinks.id,
				passwordHash: shortLinks.passwordHash,
				slug: shortLinks.slug,
				status: shortLinks.status,
				targetUrl: shortLinks.targetUrl,
				updatedAt: shortLinks.updatedAt
			})
			.from(shortLinks)
			.innerJoin(domains, eq(shortLinks.domainId, domains.id))

		const rows =
			conditions == null
				? await query.orderBy(desc(shortLinks.createdAt))
				: await query.where(conditions).orderBy(desc(shortLinks.createdAt))

		return rows.map((row) => toManagedShortLink(row))
	}

	async function createLink(
		input: ShortLinkInput,
		actorUserId: string
	): Promise<ManagedShortLink> {
		const domain = await requireDomain(input.domainId)
		const values = normalizeInput(input)
		const timestamp = new Date().toISOString()
		const linkId = crypto.randomUUID()

		try {
			await database.insert(shortLinks).values({
				createdAt: timestamp,
				createdBy: actorUserId,
				domainId: domain.id,
				expiresAt: values.expiresAt,
				httpCode: values.httpCode,
				id: linkId,
				slug: values.slug,
				status: values.status,
				targetUrl: values.targetUrl,
				updatedAt: timestamp
			})
		} catch (error) {
			throw mapLinkWriteError(error)
		}

		const created = await findLinkById(linkId)
		if (created == null) {
			throw new Error("Short link was created but could not be reloaded.")
		}

		return created
	}

	async function updateLink(
		linkId: string,
		input: ShortLinkInput
	): Promise<ManagedShortLink> {
		const existing = await findLinkById(linkId)
		if (existing == null) {
			throw new Error("Short link not found.")
		}

		await requireDomain(input.domainId)
		const values = normalizeInput(input)

		try {
			await database
				.update(shortLinks)
				.set({
					domainId: input.domainId,
					expiresAt: values.expiresAt,
					httpCode: values.httpCode,
					slug: values.slug,
					status: values.status,
					targetUrl: values.targetUrl,
					updatedAt: new Date().toISOString()
				})
				.where(eq(shortLinks.id, linkId))
		} catch (error) {
			throw mapLinkWriteError(error)
		}

		const updated = await findLinkById(linkId)
		if (updated == null) {
			throw new Error("Short link was updated but could not be reloaded.")
		}

		return updated
	}

	async function deleteLink(linkId: string): Promise<void> {
		const existing = await findLinkById(linkId)
		if (existing == null) {
			throw new Error("Short link not found.")
		}

		await database.delete(shortLinks).where(eq(shortLinks.id, linkId))
	}

	async function findLinkById(
		linkId: string
	): Promise<ManagedShortLink | null> {
		const rows = await database
			.select({
				createdAt: shortLinks.createdAt,
				createdBy: shortLinks.createdBy,
				domainHost: domains.host,
				domainId: shortLinks.domainId,
				expiresAt: shortLinks.expiresAt,
				httpCode: shortLinks.httpCode,
				id: shortLinks.id,
				passwordHash: shortLinks.passwordHash,
				slug: shortLinks.slug,
				status: shortLinks.status,
				targetUrl: shortLinks.targetUrl,
				updatedAt: shortLinks.updatedAt
			})
			.from(shortLinks)
			.innerJoin(domains, eq(shortLinks.domainId, domains.id))
			.where(eq(shortLinks.id, linkId))

		const row = rows.at(0)
		return row ? toManagedShortLink(row) : null
	}

	async function requireDomain(domainId: string) {
		const domain = await database.query.domains.findFirst({
			where: eq(domains.id, domainId)
		})
		if (domain == null) {
			throw new Error("Selected domain does not exist.")
		}

		return domain
	}

	return {
		createLink,
		deleteLink,
		listLinkDomains,
		listLinks,
		updateLink
	}
}

const repository = createLinkRepository(db)

export const createLink = repository.createLink
export const deleteLink = repository.deleteLink
export const listLinkDomains = repository.listLinkDomains
export const listLinks = repository.listLinks
export const updateLink = repository.updateLink

function buildFilterConditions(filters: LinkFilters) {
	const conditions = []
	if (filters.query && filters.query.trim().length > 0) {
		const pattern = `%${filters.query.trim().toLowerCase()}%`
		conditions.push(
			or(
				like(domains.host, pattern),
				like(shortLinks.slug, pattern),
				like(shortLinks.targetUrl, pattern)
			)
		)
	}

	if (filters.status) {
		conditions.push(eq(shortLinks.status, filters.status))
	}

	if (filters.domainId && filters.domainId.length > 0) {
		conditions.push(eq(shortLinks.domainId, filters.domainId))
	}

	return conditions.length > 0 ? and(...conditions) : null
}

function mapLinkWriteError(error: unknown) {
	if (
		error instanceof Error &&
		(error.message.includes("idx_short_links_lookup") ||
			error.message.includes(
				"UNIQUE constraint failed: short_links.domain_id, short_links.slug"
			))
	) {
		return new Error("This domain already uses that slug.")
	}

	return error instanceof Error ? error : new Error("Short link write failed.")
}

function normalizeInput(input: ShortLinkInput) {
	const slug = input.slug.trim()
	if (!SLUG_PATTERN.test(slug)) {
		throw new Error(
			"Slug must use only letters, numbers, hyphens, or underscores."
		)
	}

	let targetUrl: URL
	try {
		targetUrl = new URL(input.targetUrl.trim())
	} catch {
		throw new Error("Target URL must be a valid absolute URL.")
	}

	if (!["http:", "https:"].includes(targetUrl.protocol)) {
		throw new Error("Target URL must use http or https.")
	}

	const httpCode = Number(input.httpCode ?? 302)
	if (!ALLOWED_HTTP_CODES.has(httpCode)) {
		throw new Error("HTTP code must be one of 301, 302, or 307.")
	}

	const status = input.status ?? "active"
	if (!["active", "disabled"].includes(status)) {
		throw new Error("Status must be active or disabled.")
	}

	let expiresAt: string | null = null
	if (input.expiresAt && input.expiresAt.trim().length > 0) {
		const parsed = new Date(input.expiresAt)
		if (Number.isNaN(parsed.getTime())) {
			throw new Error("Expiry must be a valid date/time value.")
		}
		expiresAt = parsed.toISOString()
	}

	return {
		expiresAt,
		httpCode: httpCode as ManagedShortLink["httpCode"],
		slug,
		status: status as ManagedShortLink["status"],
		targetUrl: targetUrl.toString()
	}
}

function toManagedShortLink(row: ManagedShortLinkRow): ManagedShortLink {
	return {
		...row,
		httpCode: row.httpCode as ManagedShortLink["httpCode"]
	}
}

import { describe, expect, it } from "bun:test"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"

import { createDb } from "@url-shortener/shared-db/client"
import { shortLinks, users } from "@url-shortener/shared-db/schema"

import { createDomainRepository } from "./domain"

const migrationsFolder = new URL(
	"../../../../../packages/shared-db/migrations",
	import.meta.url
).pathname

describe("createDomainRepository", () => {
	it("creates normalized domains with pending verification", async () => {
		const db = createDb(
			`/tmp/url-shortener-domains-${crypto.randomUUID()}.sqlite`
		)
		migrate(db, { migrationsFolder })
		const repository = createDomainRepository(db)
		const actorUserId = await seedUser(db)

		const created = await repository.createDomain(
			"Go.Example.com.",
			actorUserId
		)

		expect(created.host).toBe("go.example.com")
		expect(created.verificationStatus).toBe("pending")
	})

	it("blocks deleting a domain that still has short links", async () => {
		const db = createDb(
			`/tmp/url-shortener-domains-${crypto.randomUUID()}.sqlite`
		)
		migrate(db, { migrationsFolder })
		const repository = createDomainRepository(db)
		const actorUserId = await seedUser(db)
		const created = await repository.createDomain("c.example.com", actorUserId)

		await db.insert(shortLinks).values({
			createdBy: actorUserId,
			domainId: created.id,
			httpCode: 302,
			id: crypto.randomUUID(),
			slug: "docs",
			status: "active",
			targetUrl: "https://example.com/docs",
			updatedAt: new Date().toISOString()
		})

		await expect(repository.deleteDomain(created.id)).rejects.toThrow(
			"Delete the short links on this domain before removing it."
		)
	})

	it("marks the domain verified when DNS matches the configured target", async () => {
		const db = createDb(
			`/tmp/url-shortener-domains-${crypto.randomUUID()}.sqlite`
		)
		migrate(db, { migrationsFolder })
		const repository = createDomainRepository(db)
		const actorUserId = await seedUser(db)
		const created = await repository.createDomain("go.example.com", actorUserId)

		const verified = await repository.verifyDomainDns(
			created.id,
			{
				expectedCnameTargets: ["redirect.example.net"],
				expectedIpv4Addresses: [],
				expectedIpv6Addresses: []
			},
			{
				resolve4: async () => [],
				resolve6: async () => [],
				resolveCname: async () => ["redirect.example.net."]
			}
		)

		expect(verified.verificationStatus).toBe("verified")
		expect(verified.verificationError).toBeNull()
		expect(verified.verificationCheckedAt).not.toBeNull()
	})

	it("marks the domain failed when DNS does not match the configured target", async () => {
		const db = createDb(
			`/tmp/url-shortener-domains-${crypto.randomUUID()}.sqlite`
		)
		migrate(db, { migrationsFolder })
		const repository = createDomainRepository(db)
		const actorUserId = await seedUser(db)
		const created = await repository.createDomain("go.example.com", actorUserId)

		const failed = await repository.verifyDomainDns(
			created.id,
			{
				expectedCnameTargets: [],
				expectedIpv4Addresses: ["203.0.113.10"],
				expectedIpv6Addresses: []
			},
			{
				resolve4: async () => ["198.51.100.10"],
				resolve6: async () => [],
				resolveCname: async () => []
			}
		)

		expect(failed.verificationStatus).toBe("failed")
		expect(failed.verificationError).toContain("Expected A 203.0.113.10")
	})

	it("sets exactly one domain as primary and clears the flag from others", async () => {
		const db = createDb(
			`/tmp/url-shortener-domains-${crypto.randomUUID()}.sqlite`
		)
		migrate(db, { migrationsFolder })
		const repository = createDomainRepository(db)
		const actorUserId = await seedUser(db)

		const domainA = await repository.createDomain("a.example.com", actorUserId)
		const domainB = await repository.createDomain("b.example.com", actorUserId)

		const primary = await repository.setPrimaryDomain(domainA.id)
		expect(primary.isPrimary).toBe(true)

		const list = await repository.listDomains()
		const bEntry = list.find((domain) => domain.id === domainB.id)
		expect(bEntry?.isPrimary).toBe(false)

		await repository.setPrimaryDomain(domainB.id)
		const updatedList = await repository.listDomains()
		expect(
			updatedList.find((domain) => domain.id === domainA.id)?.isPrimary
		).toBe(false)
		expect(
			updatedList.find((domain) => domain.id === domainB.id)?.isPrimary
		).toBe(true)
	})
})

async function seedUser(db: ReturnType<typeof createDb>) {
	const userId = crypto.randomUUID()
	await db.insert(users).values({
		email: "admin@example.com",
		id: userId,
		keycloakSub: `kc-${userId}`,
		role: "admin",
		updatedAt: new Date().toISOString()
	})

	return userId
}

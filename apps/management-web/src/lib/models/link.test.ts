import { describe, expect, it } from "bun:test"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"

import { createDb } from "@url-shortener/shared-db/client"
import { domains, users } from "@url-shortener/shared-db/schema"

import { createLinkRepository, formatShortLinkUrl } from "./link"

const migrationsFolder = new URL(
	"../../../../../packages/shared-db/migrations",
	import.meta.url
).pathname

describe("createLinkRepository", () => {
	it("formats localhost links with the redirect-service port", () => {
		expect(formatShortLinkUrl("localhost", "docs")).toBe(
			"http://localhost:8000/docs"
		)
	})

	it("formats non-localhost links with https", () => {
		expect(formatShortLinkUrl("go.example.com", "docs")).toBe(
			"https://go.example.com/docs"
		)
	})

	it("creates and lists short links with filters", async () => {
		const db = createDb(
			`/tmp/url-shortener-links-${crypto.randomUUID()}.sqlite`
		)
		migrate(db, { migrationsFolder })
		const repository = createLinkRepository(db)
		const actorUserId = await seedUser(db)
		const domainId = await seedDomain(db, actorUserId, "c.example.com")

		const created = await repository.createLink(
			{
				domainId,
				httpCode: 302,
				slug: "docs",
				targetUrl: "https://example.com/docs"
			},
			actorUserId
		)

		expect(created.domainHost).toBe("c.example.com")
		expect(created.slug).toBe("docs")

		const listed = await repository.listLinks({ query: "docs" })
		expect(listed).toHaveLength(1)
		expect(listed[0]?.targetUrl).toBe("https://example.com/docs")
	})

	it("allows the same slug on different domains but rejects duplicates per domain", async () => {
		const db = createDb(
			`/tmp/url-shortener-links-${crypto.randomUUID()}.sqlite`
		)
		migrate(db, { migrationsFolder })
		const repository = createLinkRepository(db)
		const actorUserId = await seedUser(db)
		const firstDomainId = await seedDomain(db, actorUserId, "c.example.com")
		const secondDomainId = await seedDomain(db, actorUserId, "go.example.com")

		await repository.createLink(
			{
				domainId: firstDomainId,
				slug: "same-slug",
				targetUrl: "https://example.com/first"
			},
			actorUserId
		)
		await repository.createLink(
			{
				domainId: secondDomainId,
				slug: "same-slug",
				targetUrl: "https://example.com/second"
			},
			actorUserId
		)

		await expect(
			repository.createLink(
				{
					domainId: firstDomainId,
					slug: "same-slug",
					targetUrl: "https://example.com/duplicate"
				},
				actorUserId
			)
		).rejects.toThrow("This domain already uses that slug.")
	})

	it("updates and deletes existing short links", async () => {
		const db = createDb(
			`/tmp/url-shortener-links-${crypto.randomUUID()}.sqlite`
		)
		migrate(db, { migrationsFolder })
		const repository = createLinkRepository(db)
		const actorUserId = await seedUser(db)
		const domainId = await seedDomain(db, actorUserId, "c.example.com")

		const created = await repository.createLink(
			{
				domainId,
				slug: "edit-me",
				targetUrl: "https://example.com/original"
			},
			actorUserId
		)

		const updated = await repository.updateLink(created.id, {
			domainId,
			httpCode: 301,
			slug: "edited",
			status: "disabled",
			targetUrl: "https://example.com/updated"
		})

		expect(updated.slug).toBe("edited")
		expect(updated.status).toBe("disabled")
		expect(updated.httpCode).toBe(301)

		await repository.deleteLink(created.id)

		const listed = await repository.listLinks()
		expect(listed).toHaveLength(0)
	})

	it("rejects target URLs with embedded credentials", async () => {
		const db = createDb(
			`/tmp/url-shortener-links-${crypto.randomUUID()}.sqlite`
		)
		migrate(db, { migrationsFolder })
		const repository = createLinkRepository(db)
		const actorUserId = await seedUser(db)
		const domainId = await seedDomain(db, actorUserId, "c.example.com")

		await expect(
			repository.createLink(
				{
					domainId,
					slug: "unsafe",
					targetUrl: "https://user:pass@example.com/private"
				},
				actorUserId
			)
		).rejects.toThrow("Target URL must not include a username or password.")
	})

	it("hashes password on create and preserves it when update omits password", async () => {
		const db = createDb(
			`/tmp/url-shortener-links-${crypto.randomUUID()}.sqlite`
		)
		migrate(db, { migrationsFolder })
		const repository = createLinkRepository(db)
		const actorUserId = await seedUser(db)
		const domainId = await seedDomain(db, actorUserId, "c.example.com")

		const created = await repository.createLink(
			{
				domainId,
				slug: "protected",
				targetUrl: "https://example.com/private",
				password: "secret123"
			},
			actorUserId
		)

		expect(created.passwordHash).toContain("s1:")

		const updated = await repository.updateLink(created.id, {
			domainId,
			slug: "protected",
			targetUrl: "https://example.com/private-v2"
		})

		expect(updated.passwordHash).toBe(created.passwordHash)
	})
})

async function seedDomain(
	db: ReturnType<typeof createDb>,
	createdBy: string,
	host: string
) {
	const domainId = crypto.randomUUID()
	await db.insert(domains).values({
		createdBy,
		host,
		id: domainId,
		isActive: true,
		isPrimary: false,
		updatedAt: new Date().toISOString()
	})

	return domainId
}

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

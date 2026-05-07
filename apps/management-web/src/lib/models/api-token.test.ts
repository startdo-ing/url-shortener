import { describe, expect, it } from "bun:test"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"

import { createDb } from "@url-shortener/shared-db/client"
import { users } from "@url-shortener/shared-db/schema"

import { createApiTokenRepository } from "./api-token"

const migrationsFolder = new URL(
	"../../../../../packages/shared-db/migrations",
	import.meta.url
).pathname

describe("createApiTokenRepository", () => {
	it("creates tokens, authenticates them, and increments usage count", async () => {
		const db = createDb(
			`/tmp/url-shortener-api-tokens-${crypto.randomUUID()}.sqlite`
		)
		migrate(db, { migrationsFolder })
		const repository = createApiTokenRepository(db)
		const adminId = await seedUser(db, "admin@example.com", "admin")

		const created = await repository.createApiToken("CI token", adminId)

		expect(created.record.name).toBe("CI token")
		expect(created.record.usageCount).toBe(0)
		expect(created.token.startsWith("ust_")).toBe(true)

		const viewer = await repository.authenticateApiToken(created.token)
		expect(viewer?.id).toBe(adminId)

		const listed = await repository.listApiTokens()
		expect(listed).toHaveLength(1)
		expect(listed[0]?.usageCount).toBe(1)
		expect(listed[0]?.lastUsedAt).toBeTruthy()
	})

	it("rotates and removes tokens while preserving history", async () => {
		const db = createDb(
			`/tmp/url-shortener-api-tokens-${crypto.randomUUID()}.sqlite`
		)
		migrate(db, { migrationsFolder })
		const repository = createApiTokenRepository(db)
		const adminId = await seedUser(db, "admin@example.com", "admin")

		const created = await repository.createApiToken("Deploy token", adminId)
		const rotated = await repository.rotateApiToken(created.record.id, adminId)

		expect(await repository.authenticateApiToken(created.token)).toBeNull()
		expect((await repository.authenticateApiToken(rotated.token))?.id).toBe(
			adminId
		)

		const removed = await repository.removeApiToken(rotated.record.id)
		expect(removed.revokedAt).toBeTruthy()
		expect(await repository.authenticateApiToken(rotated.token)).toBeNull()

		const listed = await repository.listApiTokens()
		expect(listed).toHaveLength(2)
		expect(listed.filter((token) => token.revokedAt == null)).toHaveLength(0)
	})
})

async function seedUser(
	db: ReturnType<typeof createDb>,
	email: string,
	role: "admin" | "member"
) {
	const userId = crypto.randomUUID()
	await db.insert(users).values({
		email,
		id: userId,
		keycloakSub: `kc-${userId}`,
		role,
		updatedAt: new Date().toISOString()
	})

	return userId
}

import { describe, expect, it } from "bun:test"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"

import { createDb } from "@url-shortener/shared-db/client"

import { createUserRepository } from "./user.ts"

const migrationsFolder = new URL(
	"../../../../packages/shared-db/migrations",
	import.meta.url
).pathname

describe("createUserRepository", () => {
	it("creates the first bootstrap user as admin only when the local store is empty", async () => {
		const db = createDb(
			`/tmp/url-shortener-bootstrap-${crypto.randomUUID()}.sqlite`
		)
		migrate(db, { migrationsFolder })

		const repository = createUserRepository(db)
		const viewer = await repository.createFirstAdminFromKeycloak({
			subject: "kc-admin-1",
			email: "first@example.com",
			displayName: "First Admin"
		})

		expect(viewer).not.toBeNull()
		expect(viewer?.role).toBe("admin")
		expect(await repository.countLocalUsers()).toBe(1)
	})

	it("refuses a second first-admin bootstrap after a local user already exists", async () => {
		const db = createDb(
			`/tmp/url-shortener-bootstrap-${crypto.randomUUID()}.sqlite`
		)
		migrate(db, { migrationsFolder })

		const repository = createUserRepository(db)
		await repository.createFirstAdminFromKeycloak({
			subject: "kc-admin-1",
			email: "first@example.com",
			displayName: "First Admin"
		})

		const secondAttempt = await repository.createFirstAdminFromKeycloak({
			subject: "kc-admin-2",
			email: "second@example.com",
			displayName: "Second Admin"
		})

		expect(secondAttempt).toBeNull()
		expect(await repository.countLocalUsers()).toBe(1)
	})

	it("promotes a member to admin and can list users in admin-first order", async () => {
		const db = createDb(
			`/tmp/url-shortener-bootstrap-${crypto.randomUUID()}.sqlite`
		)
		migrate(db, { migrationsFolder })

		const repository = createUserRepository(db)
		const admin = await repository.createFirstAdminFromKeycloak({
			subject: "kc-admin-1",
			email: "first@example.com",
			displayName: "First Admin"
		})
		if (admin == null) {
			throw new Error("expected bootstrap admin to be created")
		}
		const member = await repository.upsertViewerFromKeycloak({
			subject: "kc-member-1",
			email: "member@example.com",
			displayName: "Member User"
		})

		const promoted = await repository.updateUser(
			{ role: "admin", userId: member.id },
			admin.id
		)
		const listed = await repository.listUsers()

		expect(promoted.role).toBe("admin")
		expect(listed.map((user) => user.email)).toEqual([
			"first@example.com",
			"member@example.com"
		])
	})

	it("prevents demoting the last active admin", async () => {
		const db = createDb(
			`/tmp/url-shortener-bootstrap-${crypto.randomUUID()}.sqlite`
		)
		migrate(db, { migrationsFolder })

		const repository = createUserRepository(db)
		const admin = await repository.createFirstAdminFromKeycloak({
			subject: "kc-admin-1",
			email: "first@example.com",
			displayName: "First Admin"
		})
		if (admin == null) {
			throw new Error("expected bootstrap admin to be created")
		}
		const member = await repository.upsertViewerFromKeycloak({
			subject: "kc-member-1",
			email: "member@example.com",
			displayName: "Member User"
		})

		await expect(
			repository.updateUser({ role: "member", userId: admin.id }, member.id)
		).rejects.toThrow("At least one active admin must remain.")
	})

	it("prevents an admin from changing their own role or access state", async () => {
		const db = createDb(
			`/tmp/url-shortener-bootstrap-${crypto.randomUUID()}.sqlite`
		)
		migrate(db, { migrationsFolder })

		const repository = createUserRepository(db)
		const admin = await repository.createFirstAdminFromKeycloak({
			subject: "kc-admin-1",
			email: "first@example.com",
			displayName: "First Admin"
		})
		if (admin == null) {
			throw new Error("expected bootstrap admin to be created")
		}

		await expect(
			repository.updateUser({ active: false, userId: admin.id }, admin.id)
		).rejects.toThrow(
			"Use another admin account to change your own role or access state."
		)
	})
})

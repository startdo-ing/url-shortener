import { createDb } from "@url-shortener/shared-db/client"
import type { Db } from "@url-shortener/shared-db/client"
import { users } from "@url-shortener/shared-db/schema"
import { and, count, eq } from "drizzle-orm"

const DATABASE_PATH = Bun.env.DATABASE_PATH ?? "./dev.sqlite"
const db = createDb(DATABASE_PATH)

export interface Viewer {
	id: string
	keycloakSub: string
	email: string
	displayName: string | null
	role: "admin" | "member"
	isActive: boolean
}

export interface KeycloakProfileInput {
	subject: string
	email: string
	displayName: string | null
}

export interface UserManagementUpdate {
	active?: boolean
	role?: Viewer["role"]
	userId: string
}

export function createUserRepository(database: Db) {
	async function countLocalUsers() {
		const [{ total }] = await database.select({ total: count() }).from(users)
		return Number(total ?? 0)
	}

	async function countActiveAdmins() {
		const [{ total }] = await database
			.select({ total: count() })
			.from(users)
			.where(and(eq(users.role, "admin"), eq(users.isActive, true)))
		return Number(total ?? 0)
	}

	async function findViewerById(id: string): Promise<Viewer | null> {
		const user = await database.query.users.findFirst({
			where: eq(users.id, id)
		})
		return user ? toViewer(user) : null
	}

	async function listUsers(): Promise<Viewer[]> {
		const allUsers = await database.query.users.findMany()
		return allUsers.map(toViewer).sort(compareUsers)
	}

	async function upsertViewerFromKeycloak(
		profile: KeycloakProfileInput
	): Promise<Viewer> {
		const existingBySubject = await database.query.users.findFirst({
			where: eq(users.keycloakSub, profile.subject)
		})
		const existingByEmail = await database.query.users.findFirst({
			where: eq(users.email, profile.email)
		})

		if (
			existingByEmail &&
			(existingBySubject == null || existingByEmail.id !== existingBySubject.id)
		) {
			throw new Error(
				"This Keycloak email address is already linked to a different local user."
			)
		}

		const updatedAt = new Date().toISOString()

		if (existingBySubject) {
			await database
				.update(users)
				.set({
					email: profile.email,
					displayName: profile.displayName,
					updatedAt
				})
				.where(eq(users.id, existingBySubject.id))

			return {
				...toViewer(existingBySubject),
				email: profile.email,
				displayName: profile.displayName
			}
		}

		const viewer = buildViewer(profile, "member")

		await database.insert(users).values(toInsertValues(viewer, updatedAt))

		return viewer
	}

	async function createFirstAdminFromKeycloak(
		profile: KeycloakProfileInput
	): Promise<Viewer | null> {
		if ((await countLocalUsers()) > 0) {
			return null
		}

		const viewer = buildViewer(profile, "admin")
		const createdAt = new Date().toISOString()

		await database.insert(users).values(toInsertValues(viewer, createdAt))

		return viewer
	}

	async function updateUser(
		change: UserManagementUpdate,
		actorUserId: string
	): Promise<Viewer> {
		const existing = await database.query.users.findFirst({
			where: eq(users.id, change.userId)
		})

		if (existing == null) {
			throw new Error("User not found.")
		}

		if (existing.id === actorUserId) {
			throw new Error(
				"Use another admin account to change your own role or access state."
			)
		}

		const nextRole = change.role ?? existing.role
		const nextActive = change.active ?? existing.isActive

		if (
			existing.role === "admin" &&
			existing.isActive &&
			(nextRole !== "admin" || !nextActive) &&
			(await countActiveAdmins()) <= 1
		) {
			throw new Error("At least one active admin must remain.")
		}

		const updatedAt = new Date().toISOString()
		await database
			.update(users)
			.set({
				isActive: nextActive,
				role: nextRole,
				updatedAt
			})
			.where(eq(users.id, existing.id))

		return {
			...toViewer(existing),
			isActive: nextActive,
			role: nextRole
		}
	}

	return {
		countActiveAdmins,
		countLocalUsers,
		createFirstAdminFromKeycloak,
		findViewerById,
		listUsers,
		updateUser,
		upsertViewerFromKeycloak
	}
}

const repository = createUserRepository(db)

export const countActiveAdmins = repository.countActiveAdmins
export const countLocalUsers = repository.countLocalUsers
export const createFirstAdminFromKeycloak =
	repository.createFirstAdminFromKeycloak
export const findViewerById = repository.findViewerById
export const listUsers = repository.listUsers
export const updateUser = repository.updateUser
export const upsertViewerFromKeycloak = repository.upsertViewerFromKeycloak

function buildViewer(
	profile: KeycloakProfileInput,
	role: Viewer["role"]
): Viewer {
	return {
		id: crypto.randomUUID(),
		keycloakSub: profile.subject,
		email: profile.email,
		displayName: profile.displayName,
		role,
		isActive: true
	}
}

function toInsertValues(viewer: Viewer, timestamp: string) {
	return {
		id: viewer.id,
		keycloakSub: viewer.keycloakSub,
		email: viewer.email,
		displayName: viewer.displayName,
		role: viewer.role,
		isActive: viewer.isActive,
		createdAt: timestamp,
		updatedAt: timestamp
	}
}

function toViewer(user: typeof users.$inferSelect): Viewer {
	return {
		id: user.id,
		keycloakSub: user.keycloakSub,
		email: user.email,
		displayName: user.displayName,
		role: user.role,
		isActive: user.isActive
	}
}

function compareUsers(left: Viewer, right: Viewer) {
	if (left.role !== right.role) {
		return left.role === "admin" ? -1 : 1
	}

	if (left.isActive !== right.isActive) {
		return left.isActive ? -1 : 1
	}

	return left.email.localeCompare(right.email)
}

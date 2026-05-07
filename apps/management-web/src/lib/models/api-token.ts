import { createHash, randomBytes } from "node:crypto"

import { createDb } from "@url-shortener/shared-db/client"
import type { Db } from "@url-shortener/shared-db/client"
import { apiTokens, users } from "@url-shortener/shared-db/schema"
import { and, desc, eq, isNull, sql } from "drizzle-orm"

import type { Viewer } from "./user"

const DATABASE_PATH = process.env.DATABASE_PATH ?? "./dev.sqlite"
const db = createDb(DATABASE_PATH)

export interface ManagedApiToken {
	createdAt: string
	createdBy: string
	createdByEmail: string
	id: string
	lastUsedAt: string | null
	name: string
	revokedAt: string | null
	tokenPrefix: string
	updatedAt: string
	usageCount: number
}

export interface CreatedApiToken {
	record: ManagedApiToken
	token: string
}

export function createApiTokenRepository(database: Db) {
	async function listApiTokens(): Promise<ManagedApiToken[]> {
		const rows = await database
			.select({
				createdAt: apiTokens.createdAt,
				createdBy: apiTokens.createdBy,
				createdByEmail: users.email,
				id: apiTokens.id,
				lastUsedAt: apiTokens.lastUsedAt,
				name: apiTokens.name,
				revokedAt: apiTokens.revokedAt,
				tokenPrefix: apiTokens.tokenPrefix,
				updatedAt: apiTokens.updatedAt,
				usageCount: apiTokens.usageCount
			})
			.from(apiTokens)
			.innerJoin(users, eq(apiTokens.createdBy, users.id))
			.orderBy(desc(apiTokens.createdAt))

		return rows.map((row) => ({ ...row, usageCount: Number(row.usageCount) }))
	}

	async function createApiToken(
		name: string,
		actorUserId: string
	): Promise<CreatedApiToken> {
		const normalizedName = normalizeTokenName(name)
		await requireUser(actorUserId)

		const token = generateApiToken()
		const timestamp = new Date().toISOString()
		const tokenId = crypto.randomUUID()

		await database.insert(apiTokens).values({
			id: tokenId,
			name: normalizedName,
			tokenHash: hashApiToken(token),
			tokenPrefix: token.slice(0, 12),
			createdBy: actorUserId,
			createdAt: timestamp,
			updatedAt: timestamp
		})

		const record = await getManagedApiTokenById(tokenId)
		if (record == null) {
			throw new Error("API token was created but could not be reloaded.")
		}

		return { record, token }
	}

	async function rotateApiToken(
		tokenId: string,
		actorUserId: string
	): Promise<CreatedApiToken> {
		const existing = await getApiTokenRowById(tokenId)
		if (existing == null) {
			throw new Error("API token not found.")
		}
		if (existing.revokedAt) {
			throw new Error("API token has already been removed.")
		}

		await revokeApiToken(tokenId)
		return createApiToken(existing.name, actorUserId)
	}

	async function removeApiToken(tokenId: string): Promise<ManagedApiToken> {
		const existing = await getApiTokenRowById(tokenId)
		if (existing == null) {
			throw new Error("API token not found.")
		}
		if (existing.revokedAt) {
			throw new Error("API token has already been removed.")
		}

		await revokeApiToken(tokenId)

		const record = await getManagedApiTokenById(tokenId)
		if (record == null) {
			throw new Error("API token was removed but could not be reloaded.")
		}

		return record
	}

	async function authenticateApiToken(token: string): Promise<Viewer | null> {
		const normalizedToken = token.trim()
		if (normalizedToken.length === 0) {
			return null
		}

		const tokenRow = await database.query.apiTokens.findFirst({
			where: and(
				eq(apiTokens.tokenHash, hashApiToken(normalizedToken)),
				isNull(apiTokens.revokedAt)
			)
		})
		if (tokenRow == null) {
			return null
		}

		const user = await database.query.users.findFirst({
			where: eq(users.id, tokenRow.createdBy)
		})
		if (user == null || !user.isActive) {
			return null
		}

		const timestamp = new Date().toISOString()
		await database
			.update(apiTokens)
			.set({
				lastUsedAt: timestamp,
				updatedAt: timestamp,
				usageCount: sql`${apiTokens.usageCount} + 1`
			})
			.where(eq(apiTokens.id, tokenRow.id))

		return {
			id: user.id,
			keycloakSub: user.keycloakSub,
			email: user.email,
			displayName: user.displayName,
			role: user.role,
			isActive: user.isActive
		}
	}

	async function getManagedApiTokenById(
		tokenId: string
	): Promise<ManagedApiToken | null> {
		const rows = await database
			.select({
				createdAt: apiTokens.createdAt,
				createdBy: apiTokens.createdBy,
				createdByEmail: users.email,
				id: apiTokens.id,
				lastUsedAt: apiTokens.lastUsedAt,
				name: apiTokens.name,
				revokedAt: apiTokens.revokedAt,
				tokenPrefix: apiTokens.tokenPrefix,
				updatedAt: apiTokens.updatedAt,
				usageCount: apiTokens.usageCount
			})
			.from(apiTokens)
			.innerJoin(users, eq(apiTokens.createdBy, users.id))
			.where(eq(apiTokens.id, tokenId))

		const row = rows.at(0)
		return row ? { ...row, usageCount: Number(row.usageCount) } : null
	}

	async function getApiTokenRowById(tokenId: string) {
		return database.query.apiTokens.findFirst({
			where: eq(apiTokens.id, tokenId)
		})
	}

	async function requireUser(userId: string) {
		const user = await database.query.users.findFirst({
			where: eq(users.id, userId)
		})
		if (user == null) {
			throw new Error("User not found.")
		}

		return user
	}

	async function revokeApiToken(tokenId: string) {
		const timestamp = new Date().toISOString()
		await database
			.update(apiTokens)
			.set({ revokedAt: timestamp, updatedAt: timestamp })
			.where(eq(apiTokens.id, tokenId))
	}

	return {
		authenticateApiToken,
		createApiToken,
		listApiTokens,
		removeApiToken,
		rotateApiToken
	}
}

const repository = createApiTokenRepository(db)

export const authenticateApiToken = repository.authenticateApiToken
export const createApiToken = repository.createApiToken
export const listApiTokens = repository.listApiTokens
export const removeApiToken = repository.removeApiToken
export const rotateApiToken = repository.rotateApiToken

function normalizeTokenName(name: string): string {
	const trimmed = name.trim()
	if (trimmed.length === 0) {
		throw new Error("Token name is required.")
	}
	if (trimmed.length > 80) {
		throw new Error("Token name must be 80 characters or fewer.")
	}
	return trimmed
}

function generateApiToken(): string {
	return `ust_${randomBytes(24).toString("base64url")}`
}

function hashApiToken(token: string): string {
	return createHash("sha256").update(token).digest("hex")
}

import { describe, expect, it } from "bun:test"

import { createRequireApiViewer, readJsonBody } from "./api"
import type { Viewer } from "./models/user"

interface LoadOptions {
	configuredToken?: string | null
	hasPermission?: boolean
	firstActiveAdmin?: Viewer | null
	sessionState?: { auth?: { userId: string } }
	suppliedToken?: string | null
	viewerById?: Viewer | null
}

function makeViewer(overrides: Partial<Viewer> = {}): Viewer {
	return {
		id: overrides.id ?? crypto.randomUUID(),
		keycloakSub: overrides.keycloakSub ?? "kc-sub",
		email: overrides.email ?? "viewer@example.com",
		displayName: overrides.displayName ?? null,
		role: overrides.role ?? "admin",
		isActive: overrides.isActive ?? true
	}
}

function loadRequireApiViewer(options: LoadOptions = {}) {
	return createRequireApiViewer({
		findFirstActiveAdminFn: async () => options.firstActiveAdmin ?? null,
		findViewerByIdFn: async () => options.viewerById ?? null,
		hasPermissionFn: (_viewerOrRole, _permission) =>
			options.hasPermission ?? true,
		readSessionFn: (_request) => options.sessionState ?? {},
		readTokenFn: (_request) => options.suppliedToken ?? null,
		resolveApiTokenFn: () => options.configuredToken ?? null
	})
}

describe("requireApiViewer", () => {
	it("authorizes using bearer token when MANAGEMENT_API_TOKEN matches", async () => {
		const admin = makeViewer({ id: "admin-1", role: "admin", isActive: true })
		const requireApiViewer = loadRequireApiViewer({
			configuredToken: "secret-token",
			firstActiveAdmin: admin,
			suppliedToken: "secret-token"
		})

		const result = await requireApiViewer(
			new Request("http://localhost/api/links", {
				headers: { authorization: "Bearer secret-token" }
			}),
			"links:manage"
		)

		expect(result).toEqual({ viewerId: "admin-1" })
	})

	it("returns 503 when token auth is used but no active admin exists", async () => {
		const requireApiViewer = loadRequireApiViewer({
			configuredToken: "secret-token",
			firstActiveAdmin: null,
			suppliedToken: "secret-token"
		})

		const result = await requireApiViewer(
			new Request("http://localhost/api/links", {
				headers: { authorization: "Bearer secret-token" }
			}),
			"links:manage"
		)

		expect(result).toBeInstanceOf(Response)
		const response = result as Response
		expect(response.status).toBe(503)
		expect(await response.json()).toEqual({
			error: "API token is configured but no active admin user is available."
		})
	})

	it("falls back to session auth when token is missing", async () => {
		const viewer = makeViewer({
			id: "member-1",
			role: "member",
			isActive: true
		})
		const requireApiViewer = loadRequireApiViewer({
			sessionState: { auth: { userId: "member-1" } },
			viewerById: viewer
		})

		const result = await requireApiViewer(
			new Request("http://localhost/api/links"),
			"links:manage"
		)

		expect(result).toEqual({ viewerId: "member-1" })
	})

	it("returns 403 when session viewer lacks permission", async () => {
		const viewer = makeViewer({
			id: "member-1",
			role: "member",
			isActive: true
		})
		const requireApiViewer = loadRequireApiViewer({
			hasPermission: false,
			sessionState: { auth: { userId: "member-1" } },
			viewerById: viewer
		})

		const result = await requireApiViewer(
			new Request("http://localhost/api/users"),
			"users:manage"
		)

		expect(result).toBeInstanceOf(Response)
		const response = result as Response
		expect(response.status).toBe(403)
		expect(await response.json()).toEqual({ error: "Forbidden" })
	})

	it("returns 401 when neither token nor session auth is valid", async () => {
		const requireApiViewer = loadRequireApiViewer({
			configuredToken: "secret-token",
			sessionState: {},
			suppliedToken: "wrong-token"
		})

		const result = await requireApiViewer(
			new Request("http://localhost/api/links", {
				headers: { authorization: "Bearer wrong-token" }
			}),
			"links:manage"
		)

		expect(result).toBeInstanceOf(Response)
		const response = result as Response
		expect(response.status).toBe(401)
		expect(await response.json()).toEqual({ error: "Unauthorized" })
	})
})

describe("readJsonBody", () => {
	it("returns 400 for non-object payloads", async () => {
		const result = await readJsonBody(
			new Request("http://localhost/api/links", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(["not", "an", "object"])
			})
		)

		expect(result).toBeInstanceOf(Response)
		const response = result as Response
		expect(response.status).toBe(400)
		expect(await response.json()).toEqual({
			error: "Body must be a JSON object."
		})
	})
})

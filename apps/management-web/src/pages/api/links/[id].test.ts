import { describe, expect, it } from "bun:test"

import { createLinkItemHandlers } from "./[id]"

const sampleLink = {
	createdAt: "2026-01-01T00:00:00.000Z",
	createdBy: "user-1",
	domainHost: "c.example.com",
	domainId: "domain-1",
	expiresAt: null,
	httpCode: 302 as const,
	id: "link-1",
	passwordHash: null,
	slug: "docs",
	status: "active" as const,
	targetUrl: "https://example.com/docs",
	updatedAt: "2026-01-01T00:00:00.000Z"
}

describe("GET /api/links/:id", () => {
	it("returns 400 when id param is missing", async () => {
		const handlers = createLinkItemHandlers({
			deleteLinkFn: async () => undefined,
			getLinkByIdFn: async () => sampleLink,
			readJsonBodyFn: async () => ({}) as never,
			requireApiViewerFn: async () => ({ viewerId: "admin-1" }),
			updateLinkFn: async () => sampleLink
		})

		const response = await handlers.GET({
			params: {},
			request: new Request("http://localhost/api/links/")
		} as never)

		expect(response.status).toBe(400)
	})

	it("returns 404 when link is not found", async () => {
		const handlers = createLinkItemHandlers({
			deleteLinkFn: async () => undefined,
			getLinkByIdFn: async () => null,
			readJsonBodyFn: async () => ({}) as never,
			requireApiViewerFn: async () => ({ viewerId: "admin-1" }),
			updateLinkFn: async () => sampleLink
		})

		const response = await handlers.GET({
			params: { id: "missing" },
			request: new Request("http://localhost/api/links/missing")
		} as never)

		expect(response.status).toBe(404)
	})
})

describe("PATCH /api/links/:id", () => {
	it("updates link and returns mapped payload", async () => {
		let seenId: string | undefined
		let seenInput: unknown
		const handlers = createLinkItemHandlers({
			deleteLinkFn: async () => undefined,
			getLinkByIdFn: async () => sampleLink,
			readJsonBodyFn: async () => ({
				domainId: "domain-1",
				httpCode: 307,
				password: "secret123",
				slug: "docs-v2",
				status: "disabled",
				targetUrl: "https://example.com/v2"
			}),
			requireApiViewerFn: async () => ({ viewerId: "admin-1" }),
			updateLinkFn: async (id, input) => {
				seenId = id
				seenInput = input
				return { ...sampleLink, passwordHash: "s1:salt:key", slug: "docs-v2" }
			}
		})

		const response = await handlers.PATCH({
			params: { id: "link-1" },
			request: new Request("http://localhost/api/links/link-1", {
				method: "PATCH"
			})
		} as never)

		expect(seenId).toBe("link-1")
		expect(seenInput).toEqual({
			domainId: "domain-1",
			expiresAt: undefined,
			httpCode: 307,
			password: "secret123",
			slug: "docs-v2",
			status: "disabled",
			targetUrl: "https://example.com/v2"
		})
		expect(response.status).toBe(200)
		expect((await response.json()).isPasswordProtected).toBe(true)
	})
})

describe("DELETE /api/links/:id", () => {
	it("returns 204 when delete succeeds", async () => {
		let deletedId: string | undefined
		const handlers = createLinkItemHandlers({
			deleteLinkFn: async (id) => {
				deletedId = id
			},
			getLinkByIdFn: async () => sampleLink,
			readJsonBodyFn: async () => ({}) as never,
			requireApiViewerFn: async () => ({ viewerId: "admin-1" }),
			updateLinkFn: async () => sampleLink
		})

		const response = await handlers.DELETE({
			params: { id: "link-1" },
			request: new Request("http://localhost/api/links/link-1", {
				method: "DELETE"
			})
		} as never)

		expect(deletedId).toBe("link-1")
		expect(response.status).toBe(204)
	})

	it("returns 404 when delete reports missing link", async () => {
		const handlers = createLinkItemHandlers({
			deleteLinkFn: async () => {
				throw new Error("Short link not found.")
			},
			getLinkByIdFn: async () => sampleLink,
			readJsonBodyFn: async () => ({}) as never,
			requireApiViewerFn: async () => ({ viewerId: "admin-1" }),
			updateLinkFn: async () => sampleLink
		})

		const response = await handlers.DELETE({
			params: { id: "missing" },
			request: new Request("http://localhost/api/links/missing", {
				method: "DELETE"
			})
		} as never)

		expect(response.status).toBe(404)
		expect(await response.json()).toEqual({ error: "Short link not found." })
	})
})

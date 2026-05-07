import { describe, expect, it } from "bun:test"

import { createLinksCollectionHandlers } from "./index"

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

describe("GET /api/links", () => {
	it("returns unauthorized response from auth dependency", async () => {
		const handlers = createLinksCollectionHandlers({
			createLinkFn: async () => {
				throw new Error("should not run")
			},
			listLinksFn: async () => [],
			readJsonBodyFn: async () => ({}) as never,
			requireApiViewerFn: async () =>
				new Response(JSON.stringify({ error: "Unauthorized" }), {
					status: 401,
					headers: { "Content-Type": "application/json" }
				})
		})

		const response = await handlers.GET({
			request: new Request("http://localhost/api/links"),
			url: new URL("http://localhost/api/links")
		} as never)

		expect(response.status).toBe(401)
	})

	it("passes query filters and returns mapped links", async () => {
		let seenFilters: unknown
		const handlers = createLinksCollectionHandlers({
			createLinkFn: async () => sampleLink,
			listLinksFn: async (filters) => {
				seenFilters = filters
				return [sampleLink]
			},
			readJsonBodyFn: async () => ({}) as never,
			requireApiViewerFn: async () => ({ viewerId: "user-1" })
		})

		const response = await handlers.GET({
			request: new Request(
				"http://localhost/api/links?status=active&query=docs&domainId=domain-1"
			),
			url: new URL(
				"http://localhost/api/links?status=active&query=docs&domainId=domain-1"
			)
		} as never)

		expect(seenFilters).toEqual({
			domainId: "domain-1",
			query: "docs",
			status: "active"
		})
		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({
			items: [
				{
					createdAt: sampleLink.createdAt,
					createdBy: sampleLink.createdBy,
					domainHost: sampleLink.domainHost,
					domainId: sampleLink.domainId,
					expiresAt: sampleLink.expiresAt,
					httpCode: sampleLink.httpCode,
					id: sampleLink.id,
					isPasswordProtected: false,
					slug: sampleLink.slug,
					status: sampleLink.status,
					targetUrl: sampleLink.targetUrl,
					updatedAt: sampleLink.updatedAt
				}
			]
		})
	})
})

describe("POST /api/links", () => {
	it("creates link with parsed input and actor id", async () => {
		let seenInput: unknown
		let seenActor: string | undefined
		const handlers = createLinksCollectionHandlers({
			createLinkFn: async (input, actor) => {
				seenInput = input
				seenActor = actor
				return { ...sampleLink, passwordHash: "s1:salt:key" }
			},
			listLinksFn: async () => [],
			readJsonBodyFn: async () => ({
				domainId: "domain-1",
				expiresAt: "2027-01-01T00:00:00.000Z",
				httpCode: 307,
				password: "secret123",
				slug: "private-docs",
				status: "disabled",
				targetUrl: "https://example.com/private"
			}),
			requireApiViewerFn: async () => ({ viewerId: "admin-1" })
		})

		const response = await handlers.POST({
			request: new Request("http://localhost/api/links", { method: "POST" })
		} as never)

		expect(seenActor).toBe("admin-1")
		expect(seenInput).toEqual({
			domainId: "domain-1",
			expiresAt: "2027-01-01T00:00:00.000Z",
			httpCode: 307,
			password: "secret123",
			slug: "private-docs",
			status: "disabled",
			targetUrl: "https://example.com/private"
		})
		expect(response.status).toBe(201)
		expect((await response.json()).isPasswordProtected).toBe(true)
	})

	it("returns 400 when createLink throws", async () => {
		const handlers = createLinksCollectionHandlers({
			createLinkFn: async () => {
				throw new Error("bad input")
			},
			listLinksFn: async () => [],
			readJsonBodyFn: async () => ({
				domainId: "domain-1",
				slug: "docs",
				targetUrl: "https://example.com/docs"
			}),
			requireApiViewerFn: async () => ({ viewerId: "admin-1" })
		})

		const response = await handlers.POST({
			request: new Request("http://localhost/api/links", { method: "POST" })
		} as never)

		expect(response.status).toBe(400)
		expect(await response.json()).toEqual({ error: "bad input" })
	})
})

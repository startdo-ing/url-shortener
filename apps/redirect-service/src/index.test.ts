import { describe, expect, it } from "bun:test"
import type { Db } from "@url-shortener/shared-db/client"
import { handleRedirectRequest } from "./index.ts"
import { createRateLimiter } from "./rate-limiter.ts"

type MockDomain = { id: string }
type MockLink = {
	id: string
	status: "active" | "disabled"
	expiresAt: string | null
	passwordHash: string | null
	httpCode: number
	targetUrl: string
}

type MockDbOptions = {
	domain?: MockDomain | null
	link?: MockLink | null
	insertShouldFail?: boolean
}

function createMockDb(options: MockDbOptions) {
	return {
		query: {
			domains: {
				findFirst: async () => options.domain ?? null
			},
			shortLinks: {
				findFirst: async () => options.link ?? null
			}
		},
		insert: () => ({
			values: async () => {
				if (options.insertShouldFail) {
					throw new Error("insert failed")
				}
			}
		})
	} as unknown as Db
}

const activeLink: MockLink = {
	id: "link_1",
	status: "active",
	expiresAt: null,
	passwordHash: null,
	httpCode: 302,
	targetUrl: "https://example.com"
}

describe("handleRedirectRequest", () => {
	it("returns 400 for invalid slug format", async () => {
		const db = createMockDb({ domain: { id: "domain_1" } })
		const req = new Request("https://c.anh.pw/abc$def")

		const res = await handleRedirectRequest(req, db)

		expect(res.status).toBe(400)
	})

	it("returns 404 for password-protected links in Milestone 1", async () => {
		const db = createMockDb({
			domain: { id: "domain_1" },
			link: { ...activeLink, passwordHash: "hash_value" }
		})
		const req = new Request("https://c.anh.pw/abc123")

		const res = await handleRedirectRequest(req, db)

		expect(res.status).toBe(404)
	})

	it("returns 410 for expired links", async () => {
		const db = createMockDb({
			domain: { id: "domain_1" },
			link: { ...activeLink, expiresAt: "2000-01-01T00:00:00.000Z" }
		})
		const req = new Request("https://c.anh.pw/abc123")

		const res = await handleRedirectRequest(req, db)

		expect(res.status).toBe(410)
	})

	it("redirects active links", async () => {
		const db = createMockDb({
			domain: { id: "domain_1" },
			link: activeLink
		})
		const req = new Request("https://c.anh.pw/abc123")

		const res = await handleRedirectRequest(req, db)

		expect(res.status).toBe(302)
		expect(res.headers.get("location")).toBe("https://example.com")
	})

	it("does not fail redirect when click-event write fails", async () => {
		const db = createMockDb({
			domain: { id: "domain_1" },
			link: activeLink,
			insertShouldFail: true
		})
		const req = new Request("https://c.anh.pw/abc123")

		const res = await handleRedirectRequest(req, db)

		expect(res.status).toBe(302)
		expect(res.headers.get("location")).toBe("https://example.com")
	})

	it("returns 429 when the IP rate limit is exceeded", async () => {
		const limiter = createRateLimiter({ maxRequests: 2, windowMs: 60_000 })
		const db = createMockDb({ domain: { id: "domain_1" }, link: activeLink })
		const req = () =>
			new Request("https://c.anh.pw/abc123", {
				headers: { "x-forwarded-for": "10.0.0.1" }
			})

		expect((await handleRedirectRequest(req(), db, limiter)).status).toBe(302)
		expect((await handleRedirectRequest(req(), db, limiter)).status).toBe(302)
		expect((await handleRedirectRequest(req(), db, limiter)).status).toBe(429)
	})
})

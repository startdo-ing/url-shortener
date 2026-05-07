import { randomBytes, scryptSync } from "node:crypto"

import { describe, expect, it } from "bun:test"
import type { Db } from "@url-shortener/shared-db/client"
import {
	createAppFetch,
	handleInternalRequest,
	handleRedirectRequest
} from "./index.ts"
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
		}),
		select: () => ({
			from: async () => [{ total: 0 }]
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

	it("prompts for password when link is protected", async () => {
		const db = createMockDb({
			domain: { id: "domain_1" },
			link: { ...activeLink, passwordHash: createPasswordHash("secret123") }
		})
		const req = new Request("https://c.anh.pw/abc123")

		const res = await handleRedirectRequest(req, db)

		expect(res.status).toBe(401)
		expect(res.headers.get("content-type")).toContain("text/html")
		expect(await res.text()).toContain("Protected Link")
	})

	it("returns 401 for invalid password on protected link", async () => {
		const db = createMockDb({
			domain: { id: "domain_1" },
			link: { ...activeLink, passwordHash: createPasswordHash("secret123") }
		})
		const req = new Request("https://c.anh.pw/abc123", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({ password: "wrong" }).toString()
		})

		const res = await handleRedirectRequest(req, db)

		expect(res.status).toBe(401)
		expect(await res.text()).toContain("Invalid password")
	})

	it("redirects when the correct password is supplied", async () => {
		const db = createMockDb({
			domain: { id: "domain_1" },
			link: { ...activeLink, passwordHash: createPasswordHash("secret123") }
		})
		const req = new Request("https://c.anh.pw/abc123", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({ password: "secret123" }).toString()
		})

		const res = await handleRedirectRequest(req, db)

		expect(res.status).toBe(302)
		expect(res.headers.get("location")).toBe("https://example.com")
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

	it("returns 404 when the request host is unknown", async () => {
		const db = createMockDb({ domain: null })
		const req = new Request("https://c.anh.pw/abc123")

		const res = await handleRedirectRequest(req, db)

		expect(res.status).toBe(404)
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

describe("handleInternalRequest", () => {
	it("returns health ok when the database is reachable", async () => {
		const db = createMockDb({})

		const res = await handleInternalRequest(
			new Request("https://c.anh.pw/health"),
			db
		)

		expect(res?.status).toBe(200)
		expect(await res?.json()).toEqual({ status: "ok" })
	})

	it("returns 503 when the health check database probe fails", async () => {
		const db = {
			select: () => ({
				from: async () => {
					throw new Error("db unavailable")
				}
			})
		} as unknown as Db

		const res = await handleInternalRequest(
			new Request("https://c.anh.pw/health"),
			db
		)

		expect(res?.status).toBe(503)
		expect(await res?.json()).toEqual({ status: "error" })
	})

	it("keeps metrics disabled when no bearer token is configured", async () => {
		const db = createMockDb({})

		const res = await handleInternalRequest(
			new Request("https://c.anh.pw/metrics"),
			db,
			null
		)

		expect(res?.status).toBe(404)
	})

	it("requires a valid bearer token for metrics", async () => {
		const db = createMockDb({})

		const res = await handleInternalRequest(
			new Request("https://c.anh.pw/metrics"),
			db,
			"secret-token"
		)

		expect(res?.status).toBe(401)
		expect(res?.headers.get("www-authenticate")).toContain("Bearer")
	})
})

describe("createAppFetch", () => {
	it("serves metrics when the bearer token matches", async () => {
		const fetch = createAppFetch(createMockDb({}), {
			metricsBearerToken: "secret-token"
		})

		const res = await fetch(
			new Request("https://c.anh.pw/metrics", {
				headers: { authorization: "Bearer secret-token" }
			})
		)

		expect(res.status).toBe(200)
		expect(res.headers.get("content-type")).toContain("text/plain")
	})
})

function createPasswordHash(password: string): string {
	const salt = randomBytes(16).toString("base64url")
	const key = scryptSync(password, salt, 32).toString("base64url")
	return `s1:${salt}:${key}`
}

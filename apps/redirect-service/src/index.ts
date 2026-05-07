import { scryptSync, timingSafeEqual } from "node:crypto"

import { createDb } from "@url-shortener/shared-db/client"
import {
	domains,
	shortLinks,
	clickEvents
} from "@url-shortener/shared-db/schema"
import type { Db } from "@url-shortener/shared-db/client"
import { eq, and, count, sql } from "drizzle-orm"

import { logger } from "./logger.ts"
import { getMetricsText, incrementCounter, recordDuration } from "./metrics.ts"
import {
	rateLimiter,
	rateLimiter as defaultRateLimiter
} from "./rate-limiter.ts"

const DATABASE_PATH = Bun.env.DATABASE_PATH ?? "./dev.sqlite"
const PORT = Number(Bun.env.PORT ?? 8000)
const SLUG_PATTERN = /^[A-Za-z0-9_-]+$/
const METRICS_BEARER_TOKEN = Bun.env.METRICS_BEARER_TOKEN?.trim() || null
const CLICK_EVENT_RETENTION_DAYS = Number(
	Bun.env.CLICK_EVENT_RETENTION_DAYS ?? 90
)

interface AppFetchOptions {
	limiter?: typeof rateLimiter
	metricsBearerToken?: string | null
}

export async function pruneClickEvents(db: Db, retentionDays: number) {
	const cutoff = new Date(
		Date.now() - retentionDays * 24 * 60 * 60 * 1000
	).toISOString()
	await db.delete(clickEvents).where(sql`${clickEvents.occurredAt} < ${cutoff}`)
}

if (import.meta.main) {
	const db = createDb(DATABASE_PATH)

	// Prune stale rate-limit entries every 5 minutes
	setInterval(() => rateLimiter.prune(), 5 * 60_000)

	// Prune old click events once per day
	setInterval(
		async () => {
			try {
				await pruneClickEvents(db, CLICK_EVENT_RETENTION_DAYS)
				logger.info("click event retention pruned", {
					retentionDays: CLICK_EVENT_RETENTION_DAYS
				})
			} catch (error) {
				logger.error("click event retention prune failed", {
					error: error instanceof Error ? error.message : String(error)
				})
			}
		},
		24 * 60 * 60_000
	)

	const server = Bun.serve({
		port: PORT,
		fetch: createAppFetch(db, {
			limiter: rateLimiter,
			metricsBearerToken: METRICS_BEARER_TOKEN
		})
	})

	logger.info("started", { port: PORT })

	process.on("SIGTERM", () => {
		logger.info("received SIGTERM, shutting down")
		server.stop(true)
		db.$client.close()
		process.exit(0)
	})
}
export function createAppFetch(db: Db, options: AppFetchOptions = {}) {
	const limiter = options.limiter ?? rateLimiter
	const metricsBearerToken = options.metricsBearerToken ?? null

	return async function fetch(req: Request) {
		const url = new URL(req.url)
		const start = Date.now()
		const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID()

		const internalResponse = await handleInternalRequest(
			req,
			db,
			metricsBearerToken
		)
		const response =
			internalResponse ?? (await handleRedirectRequest(req, db, limiter))
		const duration = Date.now() - start

		logger.info("request", {
			method: req.method,
			path: url.pathname,
			host: url.hostname,
			status: response.status,
			durationMs: duration,
			requestId
		})

		recordDuration(duration)
		incrementCounter("http_requests_total", {
			service: "redirect-service",
			method: req.method,
			status: String(response.status)
		})

		return response
	}
}

export async function handleInternalRequest(
	req: Request,
	db: Db,
	metricsBearerToken: string | null = null
) {
	const url = new URL(req.url)

	if (req.method === "GET" && url.pathname === "/health") {
		try {
			await db.select({ total: count() }).from(domains)
			return Response.json({ status: "ok" })
		} catch (error) {
			logger.error("health check failed", {
				error: error instanceof Error ? error.message : String(error)
			})
			return Response.json({ status: "error" }, { status: 503 })
		}
	}

	if (req.method === "GET" && url.pathname === "/metrics") {
		if (!metricsBearerToken) {
			return new Response("Not Found", { status: 404 })
		}

		const authorization = req.headers.get("authorization")
		if (authorization !== `Bearer ${metricsBearerToken}`) {
			return new Response("Unauthorized", {
				status: 401,
				headers: { "WWW-Authenticate": 'Bearer realm="metrics"' }
			})
		}

		return new Response(getMetricsText(), {
			headers: { "Content-Type": "text/plain; version=0.0.4" }
		})
	}

	return null
}

export async function handleRedirectRequest(
	req: Request,
	db: Db,
	limiter = defaultRateLimiter
) {
	const url = new URL(req.url)
	const host = url.hostname
	const rawSlug = url.pathname.replace(/^\//, "")

	if (!rawSlug) return new Response("Not Found", { status: 404 })
	if (rawSlug.includes("/"))
		return new Response("Invalid slug format", { status: 400 })

	let slug: string
	try {
		slug = decodeURIComponent(rawSlug).trim()
	} catch {
		return new Response("Invalid slug format", { status: 400 })
	}

	if (!slug) return new Response("Not Found", { status: 404 })
	if (!SLUG_PATTERN.test(slug))
		return new Response("Invalid slug format", { status: 400 })

	// Rate limiting by IP
	const ip =
		req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
		req.headers.get("x-real-ip") ??
		"unknown"
	if (!limiter.isAllowed(ip)) {
		return new Response("Too Many Requests", {
			status: 429,
			headers: { "Retry-After": "60" }
		})
	}

	// Resolve active domain
	const domain = await db.query.domains.findFirst({
		where: and(eq(domains.host, host), eq(domains.isActive, true))
	})
	if (!domain) return new Response("Not Found", { status: 404 })

	// Resolve short link
	const link = await db.query.shortLinks.findFirst({
		where: and(eq(shortLinks.domainId, domain.id), eq(shortLinks.slug, slug))
	})
	if (!link) return new Response("Not Found", { status: 404 })

	// Evaluate link state
	if (link.status === "disabled")
		return new Response("Not Found", { status: 404 })
	if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
		return new Response("Gone", { status: 410 })
	}

	if (link.passwordHash) {
		const submittedPassword = await readPasswordFromRequest(req)
		if (submittedPassword == null) {
			return new Response(renderPasswordPrompt(host, slug), {
				status: 401,
				headers: { "Content-Type": "text/html; charset=utf-8" }
			})
		}

		if (!verifyLinkPassword(submittedPassword, link.passwordHash)) {
			return new Response(renderPasswordPrompt(host, slug, true), {
				status: 401,
				headers: { "Content-Type": "text/html; charset=utf-8" }
			})
		}
	}

	// Emit click event asynchronously — never blocks redirect
	emitClickEvent(db, link.id, host, url.pathname, req).catch(() => {})

	// Password unlock submits this endpoint via POST. If we forward 307/308, the
	// browser preserves POST to the target URL, which can return 404/405 on sites
	// that only support GET pages. 303 forces the follow-up request to use GET.
	const redirectStatus =
		link.passwordHash &&
		req.method === "POST" &&
		(link.httpCode === 307 || link.httpCode === 308)
			? 303
			: link.httpCode

	return new Response(null, {
		status: redirectStatus,
		headers: { Location: link.targetUrl }
	})
}

async function emitClickEvent(
	db: Db,
	shortLinkId: string,
	requestHost: string,
	requestPath: string,
	req: Request
) {
	const referer = req.headers.get("referer")
	const userAgent = req.headers.get("user-agent")
	const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
	const ipHash = ip ? await hashIp(ip) : null

	await db.insert(clickEvents).values({
		shortLinkId,
		requestHost,
		requestPath,
		referer,
		userAgent,
		ipHash
	})
}

async function hashIp(ip: string): Promise<string> {
	const encoder = new TextEncoder()
	const data = encoder.encode(ip)
	const hashBuffer = await crypto.subtle.digest("SHA-256", data)
	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")
}

async function readPasswordFromRequest(req: Request): Promise<string | null> {
	if (req.method !== "POST") {
		return null
	}

	const contentType = req.headers.get("content-type") ?? ""
	if (!contentType.includes("application/x-www-form-urlencoded")) {
		return null
	}

	const formData = await req.formData()
	const password = formData.get("password")
	if (typeof password !== "string") {
		return null
	}

	const trimmed = password.trim()
	return trimmed.length > 0 ? trimmed : null
}

function verifyLinkPassword(password: string, storedHash: string): boolean {
	const [version, salt, expectedKey] = storedHash.split(":")
	if (version !== "s1" || !salt || !expectedKey) {
		return false
	}

	const actual = scryptSync(password, salt, 32).toString("base64url")
	const expectedBuffer = Buffer.from(expectedKey)
	const actualBuffer = Buffer.from(actual)
	if (expectedBuffer.length !== actualBuffer.length) {
		return false
	}

	return timingSafeEqual(expectedBuffer, actualBuffer)
}

function renderPasswordPrompt(
	host: string,
	slug: string,
	invalid = false
): string {
	const escapedHost = escapeHtml(host)
	const escapedSlug = escapeHtml(slug)
	const action = `/${encodeURIComponent(slug)}`

	return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Protected Link</title>
</head>
<body>
  <main>
    <h1>Protected Link</h1>
    <p>Enter password to continue to ${escapedHost}/${escapedSlug}.</p>
    ${invalid ? '<p style="color:#b91c1c">Invalid password.</p>' : ""}
    <form method="post" action="${action}">
      <label>
        Password
        <input name="password" type="password" required />
      </label>
      <button type="submit">Continue</button>
    </form>
  </main>
</body>
</html>`
}

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;")
}

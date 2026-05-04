import { createDb } from "@url-shortener/shared-db/client"
import {
	domains,
	shortLinks,
	clickEvents
} from "@url-shortener/shared-db/schema"
import type { Db } from "@url-shortener/shared-db/client"
import { eq, and } from "drizzle-orm"

const DATABASE_PATH = Bun.env.DATABASE_PATH ?? "./dev.sqlite"
const PORT = Number(Bun.env.PORT ?? 8000)
const SLUG_PATTERN = /^[A-Za-z0-9_-]+$/

if (import.meta.main) {
	const db = createDb(DATABASE_PATH)

	Bun.serve({
		port: PORT,
		fetch(req: Request) {
			return handleRedirectRequest(req, db)
		}
	})

	console.log(`redirect-service running on port ${PORT}`)
}

export async function handleRedirectRequest(req: Request, db: Db) {
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

	// Password-protected links are out of scope for Milestone 1.
	if (link.passwordHash) return new Response("Not Found", { status: 404 })

	// Emit click event asynchronously — never blocks redirect
	emitClickEvent(db, link.id, host, url.pathname, req).catch(() => {})

	return new Response(null, {
		status: link.httpCode,
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

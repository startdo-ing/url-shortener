import type { Db } from "@url-shortener/shared-db/client"
import { domains, shortLinks } from "@url-shortener/shared-db/schema"
import { and, eq } from "drizzle-orm"

import { SLUG_PATTERN } from "../config.ts"
import { rateLimiter as defaultRateLimiter } from "../rate-limiter.ts"
import { emitClickEvent } from "../redirect/click-events.ts"
import {
	readPasswordFromRequest,
	verifyLinkPassword
} from "../redirect/password.ts"
import { renderPasswordPrompt } from "../redirect/password-prompt.ts"

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

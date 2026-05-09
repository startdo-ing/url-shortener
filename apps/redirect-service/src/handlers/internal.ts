import type { Db } from "@url-shortener/shared-db/client"
import { domains } from "@url-shortener/shared-db/schema"
import { count } from "drizzle-orm"

import { logger } from "../logger.ts"
import { getMetricsText } from "../metrics.ts"

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

import type { Db } from "@url-shortener/shared-db/client"

import { handleInternalRequest } from "./handlers/internal.ts"
import { handleRedirectRequest } from "./handlers/redirect.ts"
import { logger } from "./logger.ts"
import { incrementCounter, recordDuration } from "./metrics.ts"
import { rateLimiter } from "./rate-limiter.ts"

interface AppFetchOptions {
	limiter?: typeof rateLimiter
	metricsBearerToken?: string | null
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

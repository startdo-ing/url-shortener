import { createDb } from "@url-shortener/shared-db/client"

import {
	CLICK_EVENT_RETENTION_DAYS,
	DATABASE_PATH,
	METRICS_BEARER_TOKEN,
	PORT
} from "./config.ts"
import { logger } from "./logger.ts"
import { rateLimiter } from "./rate-limiter.ts"
import { pruneClickEvents } from "./redirect/click-events.ts"
import { createAppFetch } from "./app-fetch.ts"

export function startServer() {
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

	return server
}

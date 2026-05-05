import * as path from "node:path"

import { router } from "./app/router.ts"
import { logger } from "./app/utils/logger.ts"
import { getMetricsText, incrementCounter } from "./app/utils/metrics.ts"

const clientEntryResult = await Bun.build({
	entrypoints: [path.resolve(import.meta.dirname, "app/assets/entry.ts")],
	target: "browser",
	format: "esm",

	minify: process.env.NODE_ENV === "production"
})
const clientEntryJs = await clientEntryResult.outputs[0].text()

const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000

const server = Bun.serve({
	port,
	async fetch(request) {
		const url = new URL(request.url)

		// Client entry bundle
		if (request.method === "GET" && url.pathname === "/assets/entry.js") {
			return new Response(clientEntryJs, {
				headers: { "Content-Type": "application/javascript" }
			})
		}

		// Metrics endpoint — unauthenticated, internal use only
		if (request.method === "GET" && url.pathname === "/metrics") {
			return new Response(getMetricsText(), {
				headers: { "Content-Type": "text/plain; version=0.0.4" }
			})
		}

		const start = Date.now()

		let response: Response
		try {
			response = await router.fetch(request)
		} catch (error) {
			logger.error("unhandled error", {
				method: request.method,
				path: url.pathname,
				error: error instanceof Error ? error.message : String(error)
			})
			response = new Response("Internal Server Error", { status: 500 })
		}

		const duration = Date.now() - start
		logger.info("request", {
			method: request.method,
			path: url.pathname,
			status: response.status,
			durationMs: duration
		})

		incrementCounter("http_requests_total", {
			service: "management-web",
			method: request.method,
			status: String(response.status)
		})

		return response
	}
})

logger.info("started", { port: server.port })

let shuttingDown = false

function shutdown() {
	if (shuttingDown) {
		return
	}

	shuttingDown = true
	server.stop()
	process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)

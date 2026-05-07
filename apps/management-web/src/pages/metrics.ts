import type { APIRoute } from "astro"

import { getMetricsText } from "../lib/observability/metrics"

function getMetricsBearerToken() {
	return process.env.METRICS_BEARER_TOKEN?.trim() || null
}

export const GET: APIRoute = ({ request }) => {
	const metricsBearerToken = getMetricsBearerToken()
	if (!metricsBearerToken) {
		return new Response("Not Found", { status: 404 })
	}

	const authorization = request.headers.get("authorization")
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

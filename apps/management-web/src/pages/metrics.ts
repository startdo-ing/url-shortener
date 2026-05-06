import type { APIRoute } from "astro"

import { getMetricsText } from "../lib/observability/metrics"

export const GET: APIRoute = () => {
	return new Response(getMetricsText(), {
		headers: { "Content-Type": "text/plain; version=0.0.4" }
	})
}

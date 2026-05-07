import { afterEach, describe, expect, it } from "bun:test"

import { GET } from "./metrics"

const originalMetricsToken = process.env.METRICS_BEARER_TOKEN

afterEach(() => {
	if (originalMetricsToken == null) {
		process.env.METRICS_BEARER_TOKEN = undefined
		return
	}

	process.env.METRICS_BEARER_TOKEN = originalMetricsToken
})

describe("GET /metrics", () => {
	it("returns 404 when metrics are disabled", async () => {
		process.env.METRICS_BEARER_TOKEN = undefined

		const response = await GET({
			request: new Request("http://localhost:3000/metrics")
		} as never)

		expect(response.status).toBe(404)
	})

	it("returns 401 when the bearer token is missing", async () => {
		process.env.METRICS_BEARER_TOKEN = "secret-token"

		const response = await GET({
			request: new Request("http://localhost:3000/metrics")
		} as never)

		expect(response.status).toBe(401)
		expect(response.headers.get("www-authenticate")).toContain("Bearer")
	})

	it("returns metrics when the bearer token matches", async () => {
		process.env.METRICS_BEARER_TOKEN = "secret-token"

		const response = await GET({
			request: new Request("http://localhost:3000/metrics", {
				headers: { authorization: "Bearer secret-token" }
			})
		} as never)

		expect(response.status).toBe(200)
		expect(response.headers.get("content-type")).toContain("text/plain")
	})
})

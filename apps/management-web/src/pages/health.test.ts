import { describe, expect, it } from "bun:test"

import { GET } from "./health"

describe("GET /health", () => {
	it("returns ok when the database is reachable", async () => {
		const response = await GET({} as never)

		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({ status: "ok" })
	})
})

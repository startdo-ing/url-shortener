import { describe, expect, it } from "bun:test"

import { GET } from "./user"

describe("/user alias", () => {
	it("redirects to /users", async () => {
		const response = await GET({
			request: new Request("http://localhost/user")
		} as Parameters<typeof GET>[0])

		expect(response.status).toBe(302)
		expect(response.headers.get("location")).toBe("http://localhost/users")
	})

	it("preserves query string", async () => {
		const response = await GET({
			request: new Request("http://localhost/user?tab=tokens")
		} as Parameters<typeof GET>[0])

		expect(response.status).toBe(302)
		expect(response.headers.get("location")).toBe(
			"http://localhost/users?tab=tokens"
		)
	})
})

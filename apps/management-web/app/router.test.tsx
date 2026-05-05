import { describe, expect, it } from "bun:test"

import { router } from "./router.ts"

describe("management-web router", () => {
	it("serves the home page", async () => {
		const response = await router.fetch(new Request("http://localhost:3000/"))
		const html = await response.text()

		expect(response.status).toBe(200)
		expect(html).toContain("Management Web")
	})

	it("shows auth configuration guidance when env is missing", async () => {
		const response = await router.fetch(
			new Request("http://localhost:3000/auth")
		)
		const html = await response.text()

		expect(response.status).toBe(200)
		expect(html).toContain("Authentication")
		expect(
			html.includes("Keycloak configuration is incomplete") ||
				html.includes("Keycloak is configured and ready for OIDC sign-in.")
		).toBe(true)
	})

	it("redirects anonymous dashboard requests to auth", async () => {
		const response = await router.fetch(
			new Request("http://localhost:3000/dashboard")
		)

		expect(response.status).toBe(302)
		expect(response.headers.get("location")).toContain(
			"/auth?returnTo=%2Fdashboard"
		)
	})

	it("redirects anonymous link-management requests to auth", async () => {
		const response = await router.fetch(
			new Request("http://localhost:3000/links")
		)

		expect(response.status).toBe(302)
		expect(response.headers.get("location")).toContain(
			"/auth?returnTo=%2Flinks"
		)
	})

	it("redirects anonymous domain-management requests to auth", async () => {
		const response = await router.fetch(
			new Request("http://localhost:3000/domains")
		)

		expect(response.status).toBe(302)
		expect(response.headers.get("location")).toContain(
			"/auth?returnTo=%2Fdomains"
		)
	})

	it("redirects anonymous user-management requests to auth", async () => {
		const response = await router.fetch(
			new Request("http://localhost:3000/users")
		)

		expect(response.status).toBe(302)
		expect(response.headers.get("location")).toContain(
			"/auth?returnTo=%2Fusers"
		)
	})
})

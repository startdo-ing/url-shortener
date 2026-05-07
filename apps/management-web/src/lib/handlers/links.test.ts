import { describe, expect, it } from "bun:test"

import { FLASH_ERROR_KEY } from "../auth/constants"
import type { SessionState } from "../auth/constants"
import { handleLinkMutation } from "./links"
import type { Viewer } from "../models/user"

function makeViewer(id = "actor-1"): Viewer {
	return {
		id,
		email: "actor@example.com",
		displayName: null,
		role: "admin",
		isActive: true,
		keycloakSub: "kc"
	}
}

function makeRequest(data: Record<string, string>): Request {
	const body = new URLSearchParams(data).toString()
	return new Request("http://localhost/links", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body
	})
}

describe("handleLinkMutation", () => {
	it("redirects to /dashboard by default", async () => {
		const session: SessionState = {}
		const req = makeRequest({ intent: "unknown" })

		const response = await handleLinkMutation(req, session, makeViewer())

		expect(response.status).toBe(302)
		expect(response.headers.get("location")).toBe("/dashboard")
	})

	it("redirects to returnTo when provided", async () => {
		const session: SessionState = {}
		const req = makeRequest({
			intent: "unknown",
			returnTo: "/dashboard?pageSize=50"
		})

		const response = await handleLinkMutation(req, session, makeViewer())

		expect(response.status).toBe(302)
		expect(response.headers.get("location")).toBe("/dashboard?pageSize=50")
	})

	it("sets an error flash for unknown intent", async () => {
		const session: SessionState = {}
		const req = makeRequest({ intent: "unknown" })

		await handleLinkMutation(req, session, makeViewer())

		expect(session.flashes?.[FLASH_ERROR_KEY]).toBe(
			"Unknown short-link action."
		)
	})

	it("sets an error flash when domainId is missing on create", async () => {
		const session: SessionState = {}
		// slug and targetUrl provided but domainId omitted
		const req = makeRequest({
			intent: "create",
			slug: "test",
			targetUrl: "https://example.com",
			httpCode: "302"
		})

		await handleLinkMutation(req, session, makeViewer())

		expect(session.flashes?.[FLASH_ERROR_KEY]).toBe("Missing domainId.")
	})

	it("sets an error flash when delete intent has no linkId", async () => {
		const session: SessionState = {}
		const req = makeRequest({ intent: "delete" })

		await handleLinkMutation(req, session, makeViewer())

		expect(session.flashes?.[FLASH_ERROR_KEY]).toBe("Missing linkId.")
	})
})

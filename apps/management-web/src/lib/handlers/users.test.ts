import { describe, expect, it } from "bun:test"

import { FLASH_ERROR_KEY } from "../auth/constants"
import type { SessionState } from "../auth/constants"
import { handleUserMutation } from "./users"
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
	return new Request("http://localhost/users", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body
	})
}

describe("handleUserMutation", () => {
	it("always redirects to /users", async () => {
		const session: SessionState = {}
		const req = makeRequest({ userId: "u1", intent: "unknown" })

		const response = await handleUserMutation(req, session, makeViewer())

		expect(response.status).toBe(302)
		expect(response.headers.get("location")).toBe("/users")
	})

	it("sets an error flash when userId is missing", async () => {
		const session: SessionState = {}
		const req = makeRequest({ intent: "promote" })

		await handleUserMutation(req, session, makeViewer())

		expect(session.flashes?.[FLASH_ERROR_KEY]).toBe(
			"Invalid user-management request."
		)
	})

	it("sets an error flash when intent is missing", async () => {
		const session: SessionState = {}
		const req = makeRequest({ userId: "u1" })

		await handleUserMutation(req, session, makeViewer())

		expect(session.flashes?.[FLASH_ERROR_KEY]).toBe(
			"Invalid user-management request."
		)
	})

	it("sets an error flash for unknown intent", async () => {
		const session: SessionState = {}
		const req = makeRequest({ userId: "u1", intent: "unknown" })

		await handleUserMutation(req, session, makeViewer())

		expect(session.flashes?.[FLASH_ERROR_KEY]).toBe(
			"Unknown user-management action."
		)
	})
})

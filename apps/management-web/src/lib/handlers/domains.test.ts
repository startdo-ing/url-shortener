import { describe, expect, it } from "bun:test"

import { FLASH_ERROR_KEY } from "../auth/constants"
import type { SessionState } from "../auth/constants"
import { handleDomainMutation } from "./domains"
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
	return new Request("http://localhost/domains", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body
	})
}

describe("handleDomainMutation", () => {
	it("always redirects to /domains", async () => {
		const session: SessionState = {}
		const req = makeRequest({ intent: "unknown" })

		const response = await handleDomainMutation(req, session, makeViewer())

		expect(response.status).toBe(302)
		expect(response.headers.get("location")).toBe("/domains")
	})

	it("sets an error flash for unknown intent", async () => {
		const session: SessionState = {}
		const req = makeRequest({ intent: "unknown" })

		await handleDomainMutation(req, session, makeViewer())

		expect(session.flashes?.[FLASH_ERROR_KEY]).toBe("Unknown domain action.")
	})

	it("sets an error flash when host is missing on create", async () => {
		const session: SessionState = {}
		const req = makeRequest({ intent: "create" })

		await handleDomainMutation(req, session, makeViewer())

		expect(session.flashes?.[FLASH_ERROR_KEY]).toBe("Missing host.")
	})

	it("sets an error flash when domainId is missing on verify", async () => {
		const session: SessionState = {}
		const req = makeRequest({ intent: "verify" })

		await handleDomainMutation(req, session, makeViewer())

		expect(session.flashes?.[FLASH_ERROR_KEY]).toBe("Missing domainId.")
	})

	it("sets an error flash when domainId is missing on enable", async () => {
		const session: SessionState = {}
		const req = makeRequest({ intent: "enable" })

		await handleDomainMutation(req, session, makeViewer())

		expect(session.flashes?.[FLASH_ERROR_KEY]).toBe("Missing domainId.")
	})

	it("sets an error flash when domainId is missing on delete", async () => {
		const session: SessionState = {}
		const req = makeRequest({ intent: "delete" })

		await handleDomainMutation(req, session, makeViewer())

		expect(session.flashes?.[FLASH_ERROR_KEY]).toBe("Missing domainId.")
	})

	it("sets an error flash when domainId is missing on set-primary", async () => {
		const session: SessionState = {}
		const req = makeRequest({ intent: "set-primary" })

		await handleDomainMutation(req, session, makeViewer())

		expect(session.flashes?.[FLASH_ERROR_KEY]).toBe("Missing domainId.")
	})
})

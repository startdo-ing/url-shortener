import { describe, expect, it } from "bun:test"

import { FLASH_ERROR_KEY, FLASH_NOTICE_KEY } from "./lib/auth/constants"
import { flash, readSession, setSessionCookie } from "./lib/auth/session"

describe("session round-trip", () => {
	it("returns empty state when no cookie is present", () => {
		const req = new Request("http://localhost/")
		expect(readSession(req)).toEqual({})
	})

	it("returns empty state for a tampered cookie", () => {
		const req = new Request("http://localhost/", {
			headers: { cookie: "__management_session=bad.data" }
		})
		expect(readSession(req)).toEqual({})
	})

	it("round-trips a session with flashes through cookie encoding", () => {
		const state = {
			flashes: { [FLASH_NOTICE_KEY]: "hello", [FLASH_ERROR_KEY]: "oops" }
		}
		const cookieHeader = setSessionCookie(state)
		const cookieValue = cookieHeader.split(";")[0] // strip attributes

		const req = new Request("http://localhost/", {
			headers: { cookie: cookieValue }
		})
		const recovered = readSession(req)

		expect(recovered.flashes?.[FLASH_NOTICE_KEY]).toBe("hello")
		expect(recovered.flashes?.[FLASH_ERROR_KEY]).toBe("oops")
	})
})

describe("flash helper", () => {
	it("initialises flashes when state has none", () => {
		const state = {}
		flash(state, FLASH_ERROR_KEY, "something went wrong")
		expect(state).toEqual({
			flashes: { [FLASH_ERROR_KEY]: "something went wrong" }
		})
	})

	it("overwrites an existing flash for the same key", () => {
		const state = { flashes: { [FLASH_ERROR_KEY]: "old" } }
		flash(state, FLASH_ERROR_KEY, "new")
		expect(state.flashes?.[FLASH_ERROR_KEY]).toBe("new")
	})
})

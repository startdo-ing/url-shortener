import { describe, expect, it } from "bun:test"
import { Auth } from "remix/auth-middleware"
import { Session } from "remix/session"

import type { Viewer } from "./models/user.ts"
import {
	FLASH_ERROR_KEY,
	hasPermission,
	requireAdminViewer
} from "./security.ts"

function createViewer(role: Viewer["role"]): Viewer {
	return {
		id: `viewer-${role}`,
		keycloakSub: `kc-${role}`,
		email: `${role}@example.com`,
		displayName: role,
		role,
		isActive: true
	}
}

function createContext(viewer: Viewer) {
	const session = new Session()
	const context = {
		get(key: typeof Auth | typeof Session) {
			if (key === Auth) {
				return { identity: viewer, method: "session", ok: true }
			}

			if (key === Session) {
				return session
			}

			throw new Error("Unexpected context key")
		},
		request: new Request("http://localhost:3000/users"),
		url: new URL("http://localhost:3000/users")
	}

	return { context, session }
}

describe("requireAdminViewer", () => {
	it("uses the shared permission contract for admin and member roles", () => {
		expect(hasPermission("admin", "users:manage")).toBe(true)
		expect(hasPermission("admin", "links:manage")).toBe(true)
		expect(hasPermission("member", "dashboard:view")).toBe(true)
		expect(hasPermission("member", "users:manage")).toBe(false)
	})

	it("redirects members away from admin-only routes and flashes an error", async () => {
		const { context, session } = createContext(createViewer("member"))
		let nextCalled = false

		const response = await requireAdminViewer(context as never, async () => {
			nextCalled = true
			return new Response("ok")
		})
		if (response == null) {
			throw new Error("expected admin middleware to return a response")
		}

		expect(response.status).toBe(302)
		expect(response.headers.get("location")).toBe("/dashboard")
		expect(nextCalled).toBe(false)
		expect(session.get(FLASH_ERROR_KEY)).toBeUndefined()
	})

	it("allows admins through to the protected handler", async () => {
		const { context, session } = createContext(createViewer("admin"))
		let nextCalled = false

		const response = await requireAdminViewer(context as never, async () => {
			nextCalled = true
			return new Response("ok")
		})
		if (response == null) {
			throw new Error("expected admin middleware to return a response")
		}

		expect(nextCalled).toBe(true)
		expect(response.status).toBe(200)
		expect(session.get(FLASH_ERROR_KEY)).toBeUndefined()
	})
})

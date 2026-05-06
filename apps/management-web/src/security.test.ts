import { describe, expect, it } from "bun:test"

import { hasPermission } from "./lib/auth/permissions"

describe("hasPermission", () => {
	it("uses the shared permission contract for admin and member roles", () => {
		expect(hasPermission("admin", "users:manage")).toBe(true)
		expect(hasPermission("admin", "links:manage")).toBe(true)
		expect(hasPermission("member", "dashboard:view")).toBe(true)
		expect(hasPermission("member", "users:manage")).toBe(false)
	})

	it("grants admin all permissions", () => {
		expect(hasPermission("admin", "analytics:view")).toBe(true)
		expect(hasPermission("admin", "dashboard:view")).toBe(true)
		expect(hasPermission("admin", "domains:manage")).toBe(true)
		expect(hasPermission("admin", "links:manage")).toBe(true)
		expect(hasPermission("admin", "users:manage")).toBe(true)
	})

	it("grants member all permissions except users:manage", () => {
		expect(hasPermission("member", "analytics:view")).toBe(true)
		expect(hasPermission("member", "dashboard:view")).toBe(true)
		expect(hasPermission("member", "domains:manage")).toBe(true)
		expect(hasPermission("member", "links:manage")).toBe(true)
		expect(hasPermission("member", "users:manage")).toBe(false)
	})

	it("accepts a viewer object as first argument", () => {
		const adminViewer = { role: "admin" as const }
		const memberViewer = { role: "member" as const }
		expect(hasPermission(adminViewer, "users:manage")).toBe(true)
		expect(hasPermission(memberViewer, "users:manage")).toBe(false)
		expect(hasPermission(memberViewer, "links:manage")).toBe(true)
	})
})

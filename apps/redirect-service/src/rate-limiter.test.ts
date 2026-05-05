import { describe, expect, it } from "bun:test"

import { createRateLimiter } from "./rate-limiter.ts"

describe("createRateLimiter", () => {
	it("allows requests under the limit", () => {
		const limiter = createRateLimiter({ maxRequests: 5, windowMs: 60_000 })

		for (let i = 0; i < 5; i++) {
			expect(limiter.isAllowed("1.2.3.4")).toBe(true)
		}
	})

	it("blocks requests that exceed the limit within the window", () => {
		const limiter = createRateLimiter({ maxRequests: 3, windowMs: 60_000 })

		expect(limiter.isAllowed("1.2.3.4")).toBe(true)
		expect(limiter.isAllowed("1.2.3.4")).toBe(true)
		expect(limiter.isAllowed("1.2.3.4")).toBe(true)
		expect(limiter.isAllowed("1.2.3.4")).toBe(false)
		expect(limiter.isAllowed("1.2.3.4")).toBe(false)
	})

	it("tracks different IPs independently", () => {
		const limiter = createRateLimiter({ maxRequests: 2, windowMs: 60_000 })

		expect(limiter.isAllowed("1.1.1.1")).toBe(true)
		expect(limiter.isAllowed("1.1.1.1")).toBe(true)
		expect(limiter.isAllowed("1.1.1.1")).toBe(false)

		// Different IP is unaffected
		expect(limiter.isAllowed("2.2.2.2")).toBe(true)
		expect(limiter.isAllowed("2.2.2.2")).toBe(true)
	})

	it("allows requests again after the window expires", async () => {
		const limiter = createRateLimiter({ maxRequests: 2, windowMs: 20 })

		expect(limiter.isAllowed("1.2.3.4")).toBe(true)
		expect(limiter.isAllowed("1.2.3.4")).toBe(true)
		expect(limiter.isAllowed("1.2.3.4")).toBe(false)

		// Wait for window to expire
		await Bun.sleep(30)

		expect(limiter.isAllowed("1.2.3.4")).toBe(true)
	})

	it("prune removes stale entries", async () => {
		const limiter = createRateLimiter({ maxRequests: 10, windowMs: 20 })

		limiter.isAllowed("1.2.3.4")
		await Bun.sleep(30)

		// Before prune the entry still exists internally (stale)
		limiter.prune()

		// After prune, the window is fresh — requests are allowed again
		expect(limiter.isAllowed("1.2.3.4")).toBe(true)
	})
})

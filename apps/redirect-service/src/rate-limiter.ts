/**
 * IP-based sliding-window rate limiter.
 * Tracks request timestamps per IP in-process; no external dep.
 *
 * Default: 120 requests per 60 seconds per IP.
 */

export interface RateLimiterOptions {
	/** Maximum number of requests allowed within the window. */
	maxRequests: number
	/** Window length in milliseconds. */
	windowMs: number
}

const DEFAULT_OPTIONS: RateLimiterOptions = {
	maxRequests: 120,
	windowMs: 60_000
}

export function createRateLimiter(
	options: RateLimiterOptions = DEFAULT_OPTIONS
) {
	const windows = new Map<string, number[]>()

	function isAllowed(ip: string): boolean {
		const now = Date.now()
		const cutoff = now - options.windowMs
		const timestamps = (windows.get(ip) ?? []).filter((t) => t > cutoff)

		if (timestamps.length >= options.maxRequests) {
			// Store the trimmed list (evict expired) without adding current
			windows.set(ip, timestamps)
			return false
		}

		timestamps.push(now)
		windows.set(ip, timestamps)
		return true
	}

	/** Prune all entries that have no timestamps in the current window. Call periodically to avoid unbounded growth. */
	function prune() {
		const cutoff = Date.now() - options.windowMs
		for (const [ip, timestamps] of windows) {
			const active = timestamps.filter((t) => t > cutoff)
			if (active.length === 0) {
				windows.delete(ip)
			} else {
				windows.set(ip, active)
			}
		}
	}

	return { isAllowed, prune }
}

export const rateLimiter = createRateLimiter()

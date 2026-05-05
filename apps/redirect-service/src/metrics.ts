/**
 * Minimal in-process Prometheus-format metrics.
 * Counters only — no histograms, no external dep.
 * Expose via GET /metrics on the app's HTTP server.
 */

type Labels = Record<string, string>

const counters = new Map<string, number>()

function labelStr(labels: Labels) {
	return Object.entries(labels)
		.map(([k, v]) => `${k}="${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`)
		.join(",")
}

function counterKey(name: string, labels: Labels) {
	const l = labelStr(labels)
	return l ? `${name}{${l}}` : name
}

export function incrementCounter(name: string, labels: Labels = {}) {
	const key = counterKey(name, labels)
	counters.set(key, (counters.get(key) ?? 0) + 1)
}

export function getMetricsText(): string {
	const lines: string[] = []
	for (const [key, value] of counters) {
		lines.push(`${key} ${value}`)
	}
	return `${lines.join("\n")}\n`
}

/** Reset all counters — for testing only. */
export function resetMetrics() {
	counters.clear()
}

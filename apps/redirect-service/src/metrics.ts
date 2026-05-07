/**
 * Minimal in-process Prometheus-format metrics.
 * Expose via GET /metrics on the app's HTTP server.
 */

type Labels = Record<string, string>

const counters = new Map<string, number>()

// Histogram buckets in milliseconds for request duration
const DURATION_BUCKETS = [10, 25, 50, 100, 250, 500, 1000]
// bucket key → count; "+Inf" key stores total count
const histogramBuckets = new Map<string, number>()
let histogramSum = 0
let histogramCount = 0

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

export function recordDuration(durationMs: number) {
	histogramSum += durationMs
	histogramCount += 1
	for (const bucket of DURATION_BUCKETS) {
		if (durationMs <= bucket) {
			const key = String(bucket)
			histogramBuckets.set(key, (histogramBuckets.get(key) ?? 0) + 1)
		}
	}
}

export function getMetricsText(): string {
	const lines: string[] = []

	for (const [key, value] of counters) {
		lines.push(`${key} ${value}`)
	}

	// Prometheus histogram format
	lines.push(
		"# HELP http_request_duration_ms HTTP request duration in milliseconds.",
		"# TYPE http_request_duration_ms histogram"
	)
	let cumulativeCount = 0
	for (const bucket of DURATION_BUCKETS) {
		cumulativeCount += histogramBuckets.get(String(bucket)) ?? 0
		lines.push(
			`http_request_duration_ms_bucket{le="${bucket}"} ${cumulativeCount}`
		)
	}
	lines.push(`http_request_duration_ms_bucket{le="+Inf"} ${histogramCount}`)
	lines.push(`http_request_duration_ms_sum ${histogramSum}`)
	lines.push(`http_request_duration_ms_count ${histogramCount}`)

	return `${lines.join("\n")}\n`
}

/** Reset all metrics — for testing only. */
export function resetMetrics() {
	counters.clear()
	histogramBuckets.clear()
	histogramSum = 0
	histogramCount = 0
}

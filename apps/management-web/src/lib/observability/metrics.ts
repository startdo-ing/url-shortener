type Labels = Record<string, string>

const counters = new Map<string, number>()

// Histogram buckets in milliseconds for request duration
const DURATION_BUCKETS = [10, 25, 50, 100, 250, 500, 1000]
const histogramBuckets = new Map<string, number>()
let histogramSum = 0
let histogramCount = 0

export function incrementCounter(name: string, labels: Labels, value = 1) {
	const key = buildCounterKey(name, labels)
	const current = counters.get(key) ?? 0
	counters.set(key, current + value)
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

export function getMetricsText() {
	const lines = [
		"# HELP http_requests_total Total HTTP requests processed.",
		"# TYPE http_requests_total counter"
	]

	for (const [key, total] of counters.entries()) {
		lines.push(`${key} ${total}`)
	}

	if (counters.size === 0) {
		lines.push(
			'http_requests_total{service="management-web",method="GET",status="200"} 0'
		)
	}

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

function buildCounterKey(name: string, labels: Labels) {
	const parts = Object.entries(labels)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([key, value]) => `${key}="${escapeLabel(value)}"`)
		.join(",")

	return `${name}{${parts}}`
}

function escapeLabel(value: string) {
	return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')
}

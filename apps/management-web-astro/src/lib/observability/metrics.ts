type Labels = Record<string, string>

const counters = new Map<string, number>()

export function incrementCounter(name: string, labels: Labels, value = 1) {
	const key = buildCounterKey(name, labels)
	const current = counters.get(key) ?? 0
	counters.set(key, current + value)
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
			'http_requests_total{service="management-web-astro",method="GET",status="200"} 0'
		)
	}

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

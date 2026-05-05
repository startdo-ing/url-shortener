type LogLevel = "info" | "warn" | "error"
type LogFields = Record<string, unknown>

const IS_PROD = Bun.env.NODE_ENV === "production"

function log(
	service: string,
	level: LogLevel,
	msg: string,
	fields?: LogFields
) {
	const entry = {
		timestamp: new Date().toISOString(),
		level,
		service,
		msg,
		...fields
	}

	if (IS_PROD) {
		console.log(JSON.stringify(entry))
	} else {
		const prefix = `[${entry.timestamp}] ${level.toUpperCase()} [${service}]`
		if (level === "error") {
			console.error(prefix, msg, fields ?? "")
		} else {
			console.log(prefix, msg, fields ?? "")
		}
	}
}

export function createLogger(service: string) {
	return {
		info: (msg: string, fields?: LogFields) =>
			log(service, "info", msg, fields),
		warn: (msg: string, fields?: LogFields) =>
			log(service, "warn", msg, fields),
		error: (msg: string, fields?: LogFields) =>
			log(service, "error", msg, fields)
	}
}

export const logger = createLogger("redirect-service")

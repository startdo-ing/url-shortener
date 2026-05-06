type LogLevel = "info" | "warn" | "error"

interface LogMetadata {
	[key: string]: unknown
}

const service = "management-web-astro"

function write(level: LogLevel, message: string, metadata: LogMetadata = {}) {
	const entry = {
		timestamp: new Date().toISOString(),
		level,
		service,
		message,
		...metadata
	}

	if (process.env.NODE_ENV === "production") {
		console.log(JSON.stringify(entry))
		return
	}

	console.log(`${entry.timestamp} ${level.toUpperCase()} ${message}`, metadata)
}

export const logger = {
	info(message: string, metadata?: LogMetadata) {
		write("info", message, metadata)
	},
	warn(message: string, metadata?: LogMetadata) {
		write("warn", message, metadata)
	},
	error(message: string, metadata?: LogMetadata) {
		write("error", message, metadata)
	}
}

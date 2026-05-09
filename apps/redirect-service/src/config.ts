export const DATABASE_PATH = Bun.env.DATABASE_PATH ?? "./dev.sqlite"
export const PORT = Number(Bun.env.PORT ?? 8000)
export const SLUG_PATTERN = /^[A-Za-z0-9_-]+$/
export const METRICS_BEARER_TOKEN = Bun.env.METRICS_BEARER_TOKEN?.trim() || null
export const CLICK_EVENT_RETENTION_DAYS = Number(
	Bun.env.CLICK_EVENT_RETENTION_DAYS ?? 90
)

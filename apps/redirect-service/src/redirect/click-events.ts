import type { Db } from "@url-shortener/shared-db/client"
import { clickEvents } from "@url-shortener/shared-db/schema"
import { sql } from "drizzle-orm"

export async function pruneClickEvents(db: Db, retentionDays: number) {
	const cutoff = new Date(
		Date.now() - retentionDays * 24 * 60 * 60 * 1000
	).toISOString()
	await db.delete(clickEvents).where(sql`${clickEvents.occurredAt} < ${cutoff}`)
}

export async function emitClickEvent(
	db: Db,
	shortLinkId: string,
	requestHost: string,
	requestPath: string,
	req: Request
) {
	const referer = req.headers.get("referer")
	const userAgent = req.headers.get("user-agent")
	const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
	const ipHash = ip ? await hashIp(ip) : null

	await db.insert(clickEvents).values({
		shortLinkId,
		requestHost,
		requestPath,
		referer,
		userAgent,
		ipHash
	})
}

async function hashIp(ip: string): Promise<string> {
	const encoder = new TextEncoder()
	const data = encoder.encode(ip)
	const hashBuffer = await crypto.subtle.digest("SHA-256", data)
	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")
}

import type { APIRoute } from "astro"

import { createDb } from "@url-shortener/shared-db/client"
import { users } from "@url-shortener/shared-db/schema"
import { count } from "drizzle-orm"

const DATABASE_PATH = process.env.DATABASE_PATH ?? "./dev.sqlite"

export const GET: APIRoute = async () => {
	try {
		const db = createDb(DATABASE_PATH)
		await db.select({ total: count() }).from(users)
		return Response.json({ status: "ok" })
	} catch {
		return Response.json({ status: "error" }, { status: 503 })
	}
}

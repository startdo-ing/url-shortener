import type { APIRoute } from "astro"

import { createDb } from "@url-shortener/shared-db/client"

const DATABASE_PATH = process.env.DATABASE_PATH ?? "./dev.sqlite"

export const GET: APIRoute = async () => {
	try {
		const db = createDb(DATABASE_PATH)
		db.$client.exec("SELECT 1;")
		return Response.json({ status: "ok" })
	} catch {
		return Response.json({ status: "error" }, { status: 503 })
	}
}

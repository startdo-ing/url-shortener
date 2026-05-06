import { drizzle } from "drizzle-orm/bun-sqlite"
import { Database } from "bun:sqlite"
import * as schema from "./schema"

export function createDb(databasePath: string) {
	// Diagnostic: log the DATABASE_PATH being used
	console.log(`[DB] DATABASE_PATH=${databasePath}`)

	const sqlite = new Database(databasePath, { create: true })

	// Enable WAL mode for concurrent read/write access from both apps
	sqlite.exec("PRAGMA journal_mode = WAL;")
	sqlite.exec("PRAGMA foreign_keys = ON;")

	return drizzle(sqlite, { schema })
}

export type Db = ReturnType<typeof createDb>

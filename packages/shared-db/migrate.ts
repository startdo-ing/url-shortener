import { migrate } from "drizzle-orm/bun-sqlite/migrator"

import { createDb } from "./client"

const databasePath = Bun.env.DATABASE_PATH ?? "./dev.sqlite"

console.log("[MIGRATE] Starting migration script")
console.log("[MIGRATE] Expected: DATABASE_PATH env var set")
console.log(`[MIGRATE] Received: ${databasePath}`)

const db = createDb(databasePath)

migrate(db, { migrationsFolder: "./migrations" })

console.log(`[MIGRATE] Migration script completed for ${databasePath}`)

process.exit(0)

import { migrate } from "drizzle-orm/bun-sqlite/migrator"

import { createDb } from "./client"

const databasePath = Bun.env.DATABASE_PATH ?? "./dev.sqlite"

const db = createDb(databasePath)

migrate(db, { migrationsFolder: "./migrations" })

console.log(`Applied migrations to ${databasePath}`)

/**
 * SQLite backup script.
 *
 * Usage:
 *   bun run packages/shared-db/backup.ts
 *
 * Environment variables:
 *   DATABASE_PATH  Path to the source SQLite database (default: ./dev.sqlite)
 *   BACKUP_DIR     Directory to write the backup file   (default: ./backups)
 *
 * The backup file name includes a UTC timestamp, e.g.:
 *   backups/db-2026-05-05T14-30-00Z.sqlite
 *
 * SQLite's .backup() API uses the online backup mechanism, so it is safe to
 * run while the database is open and being written to by either app.
 */

import { Database } from "bun:sqlite"
import { mkdirSync } from "node:fs"
import { join } from "node:path"

const databasePath = Bun.env.DATABASE_PATH ?? "./dev.sqlite"
const backupDir = Bun.env.BACKUP_DIR ?? "./backups"
const timestamp = new Date().toISOString().replace(/:/g, "-").replace(/\..+/, "Z")
const backupPath = join(backupDir, `db-${timestamp}.sqlite`)

mkdirSync(backupDir, { recursive: true })

const db = new Database(databasePath, { readonly: true })
db.run(`PRAGMA wal_checkpoint(FULL)`)

// @ts-expect-error: Bun's Database type exposes .backup() at runtime but it is not in the d.ts yet
db.backup(backupPath)
db.close()

console.log(`Backup written to ${backupPath}`)

import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, readdirSync } from "node:fs";
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

const __dir = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dir, "..", "migrations");

try {
  await sql`
    CREATE TABLE IF NOT EXISTS _schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    const already = await sql`
      SELECT 1 AS x FROM _schema_migrations WHERE id = ${file}
    `;
    if (already.length) continue;

    const body = readFileSync(join(migrationsDir, file), "utf8");

    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`INSERT INTO _schema_migrations (id) VALUES (${file})`;
    });
    console.warn(`applied ${file}`);
  }
  console.warn("migrate: done");
} finally {
  await sql.end({ timeout: 5 });
}

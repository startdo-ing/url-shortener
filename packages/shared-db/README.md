# packages/shared-db

Shared Drizzle ORM schema, migrations, and database client factory used by both apps.

## Contents

- `schema.ts` — Drizzle table definitions (source of truth for all DB entities)
- `client.ts` — database client factory (accepts connection string)
- `drizzle.config.ts` — drizzle-kit configuration for migrations and Studio
- `migrations/` — drizzle-kit generated migration files

## Usage

```ts
import { db } from '@url-shortener/shared-db/client'
import { shortLinks, domains } from '@url-shortener/shared-db/schema'
```

## Commands

```bash
# Run migrations with Bun SQLite
DATABASE_PATH=./dev.sqlite bun run migrate

# Open Drizzle Studio (local DB browser)
bun run studio
```

# ADR-008: SQLite (Bun Built-in) as the Database

## Status
Accepted

## Context
The project needs a reliable relational database shared by both apps. The choice affects Drizzle driver selection, migration tooling, and operational complexity.

Both apps run on Bun, which ships with SQLite as a first-class built-in with no additional dependencies.

## Decision
Use SQLite via Bun's built-in SQLite driver as the database for all environments.

Drizzle integration:
- Use `drizzle-orm/bun-sqlite` driver with Bun's native `bun:sqlite` module.
- No separate database process or connection string required.
- Database file path configured via environment variable (e.g. `DATABASE_PATH`).

## Consequences
Positive:
- Zero additional dependencies — SQLite is built into Bun.
- No database server to run locally or in production.
- Simpler deployment: database is a single file.
- Fast for read-heavy workloads like redirect lookups.
- Drizzle has first-class `bun-sqlite` driver support.

Negative:
- No native jsonb type — audit_logs.metadata stored as TEXT (JSON string).

Notes on concurrent access:
- This is a single-user personal app. Write volume is low by design.
- redirect-service writes click events asynchronously and infrequently.
- WAL mode enabled at connection time to handle concurrent reads from both apps.
- Horizontal scaling is not a requirement and not a concern for this project.

## Alternatives Considered
1. PostgreSQL
- Rejected in favor of zero-dependency simplicity with Bun's built-in SQLite.

2. MySQL/MariaDB
- Rejected for same reason.

## Follow-up
- Add `drizzle-orm` and `drizzle-kit` to `packages/shared-db` dependencies.
- Enable WAL mode in database client setup.
- Define `DATABASE_PATH` in `.env.example` for both apps.
- No scaling revisit planned. SQLite is sufficient for a single-user personal app.

# ADR-007: Drizzle ORM as Database Access Layer

## Status
Accepted

## Context
Both apps need a type-safe, low-overhead way to access the shared database. Schema and migrations must be managed consistently and shared between apps. A local database inspection UI is also desirable without adding heavyweight tooling.

## Decision
Use Drizzle ORM as the database access layer across the project.

Scope:
- Schema defined once in `packages/shared-db/schema.ts`.
- Both `apps/management-web` and `apps/redirect-service` import schema and db client from `packages/shared-db`.
- Migrations managed by `drizzle-kit`.
- Drizzle driver: `drizzle-orm/bun-sqlite` with Bun's native `bun:sqlite`.
- Drizzle Studio used for local DB inspection via `bunx drizzle-kit studio`.

## Consequences
Positive:
- Single schema source of truth shared across both apps.
- Type-safe queries reduce runtime errors.
- Drizzle Studio replaces need for phpMyAdmin or separate DB GUI.
- Drizzle works natively with Bun in both apps.
- Thin query layer keeps redirect-service fast and explicit.
- Migration workflow is built-in via drizzle-kit.

Negative:
- Both apps must import from shared package — workspace/monorepo setup required.
- Schema changes affect both apps simultaneously — requires coordinated deploys.

## Alternatives Considered
1. Separate ORM or raw SQL per app
- Rejected due to schema drift and duplication risk.

2. Prisma
- Rejected in favor of Drizzle's lighter runtime and better Bun compatibility.

## Follow-up
- Initialize `packages/shared-db` with Drizzle schema matching DB-SCHEMA-INIT.md.
- Configure monorepo workspace so both apps can import the shared package.
- Set up drizzle-kit config and first migration.
- Document how to run Drizzle Studio locally.

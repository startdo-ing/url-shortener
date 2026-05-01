# ADR 0001 — Monorepo with two Bun apps and one PostgreSQL

## Status

Accepted

## Context

Personal URL shortener: public redirects must stay minimal and fast; management and analytics need a richer stack. Product pillars require a hard boundary between click traffic and operator UI ([docs/PRODUCT.md](../PRODUCT.md)).

## Decision

Use one repository with:

- `apps/redirect` — Bun HTTP service for `GET /:slug` only.
- `apps/portal` — Astro + Svelte SSR for operator workflows.
- `packages/core` — shared domain validation and types.
- `packages/db` — schema and migrations consumed by both apps.
- **One** PostgreSQL database as the system of record.

## Alternatives considered

1. **Single combined app** — rejected: violates pillar 1 isolation and complicates sizing cookies vs public traffic.
2. **Separate repos** — deferred: unnecessary friction for solo operator; revisit if reuse or OSS split needed.
3. **SQLite** — rejected per [PRODUCT_PLAN.md](../PRODUCT_PLAN.md).

## Consequences

- Shared migrations must deploy before either app relies on new columns.
- CI should run migration checks and both app builds/tests.
- Two deploy units in production (`c.` vs `short.` origins) documented in ops runbooks when added.

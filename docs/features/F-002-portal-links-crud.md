# F-002 — Portal link CRUD shell

- **Status:** done
- **Owner:** Operator (solo)
- **Linked requirements:** R-005, R-020, R-021, R-022, R-023, R-031 *(layout tokens only — full R-027/R-028/R-024/R-025 in later F-)*
- **Linked ADRs:** [ADR 0001](../adr/0001-monorepo-two-apps-postgres.md)
- **Depends on Q:** none
- **Estimated slices:** 1

## Goal

Operator manages links in a **SSR portal** (`apps/portal`): create with random or custom slug, list rows, edit fields, delete. Destinations obey **forbidden schemes** (**R-005**). Pages use **`design.md` CSS variables / typography baseline** (**R-031** checklist).

## Consistency Invariant Check

- [x] Requirements + ARCHITECTURE cover stack; Postgres shared with redirect.

## Design Notes

- Astro `output: server` + `@astrojs/node` standalone; Bun runs dev/build via Astro CLI.
- Persistence: same `DATABASE_URL`; no new tables (uses `links` from F-001 migration).
- Notes: plain `textarea` in forms (storage only); markdown UX deferred to align with **R-027/R-028**.

## Public Contract

### HTTP (portal origin)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/` | HTML list of links (slug, destination, status, redirect type, title snippet). |
| `GET` | `/links/new` | Create form |
| `GET` | `/links/[id]/edit` | Edit form UUID `id` |
| `POST` | `/api/links` `application/x-www-form-urlencoded` | Create: fields `destination_url`, optional `slug`, `redirect_type`, `status`, optional `display_title`, optional `notes_markdown` |
| `POST` | `/api/links/update` | `id`, `destination_url`, `slug`, … same shape |
| `POST` | `/api/links/delete` | `id` |

**Redirects after mutation:** `303` → `/` on success.

**Errors:** duplicate slug ⇒ `303`/`302` redirect to `/links/new?error=duplicate` or edit with query `error=duplicate` *(pick one stable pattern; freeze in tests if any)* — use **same create URL** with `?error=duplicate_slug` plain text banner.

**R-005:** reject `javascript:`, `vbscript:`, `data:` schemes and non-http(s) — user-visible `"Invalid destination URL"` banner.

### Shared library — `packages/core`

- `validateDestinationUrl(raw: string): { ok: true; normalized: string } | { ok: false; reason: string }`
- `generateRandomSlug(length?: number): string` — **[a-zA-Z0-9]{length}**, default length **8**, crypto RNG.

### Slug collision

On insert unique violation ⇒ operator-visible duplicate error (**R-021**).

## Test List

- [x] **R-005** — table: `javascript:…`, `https://ok.example` → deny / accept (`packages/core/src/url.test.ts`)
- [x] **generateRandomSlug** — length fixed; charset `[A-Za-z0-9]` only
- [x] slug segment validation — `parseSlugInput` (`packages/core/src/slug-input.test.ts`)

## Implementation Checklist

- [x] F-002 spec finalized (this file)
- [x] `packages/core` URL validation + random slug + tests
- [x] `apps/portal` Astro + Svelte + `@astrojs/node`, global CSS tokens
- [x] Forms + API routes wired to Postgres
- [x] `bun test` green; `./tools/audit.sh F-002`; CHANGELOG line
- [x] Reality Check: `astro build` succeeds *(live dev + curl: operator with Docker Postgres)*

## Out of Scope

- **R-024–R-026** unfurl / preview refresh *(F-003+)*
- **R-027–R-028** markdown editor / modal *(F-004+)*
- **R-029** bulk import
- **In-app auth**

## Lessons / Surprises

- *(fill)*

## Reality Check (final)

```
$ bun test
30 pass, 0 fail

$ ./tools/audit.sh F-002
audit F-002 OK (minimal traceability grep)

$ cd apps/portal && bun run build
[build] Complete!

fingerprint: 2026-05-01T11:43:45+00:00 (approx build timestamp in session)
```

## Changelog Entry

- `F-002: Astro portal SSR for link CRUD with design-token layout.`

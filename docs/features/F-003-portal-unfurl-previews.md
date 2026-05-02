# F-003 — Portal unfurl + link list previews + optional expiry UX

- **Status:** done
- **Owner:** Operator (solo)
- **Linked requirements:** R-022, R-024, R-025, **R-026** (could), **R-004 / R-032** docs touch
- **Linked ADRs:** [ADR 0001](../adr/0001-monorepo-two-apps-postgres.md), [ADR 0002](../adr/0002-unfurl-fetch-ssrf-boundaries.md)
- **Depends on Q:** *(none blocking — SSRF/policy in ADR-0002)*
- **Estimated slices:** 1–2

## Goal

Operator can trigger **Fetch / refresh preview** per link (**R-024**, **R-026**); list page shows **stored** `display_title`, `target_preview` (image, description, hostname) with **design.md** fallbacks (**R-025**) — zero per-row outbound HTTP from list routes. Optionally edit **`expires_at`** on create/edit (**PRODUCT_PLAN** §4.1) surfaced in portal (**R-004** linkage).

## Consistency Invariant Check

- [x] Requirement ids cited; ADR captures SSRF/policy.
- [ ] Before **05-test-first**, confirm pillar links in REQUIREMENTS unchanged.

## Design Notes

- **Layers:** `apps/portal` server actions/API + optional `packages/core` pure parsers for OG extraction (no network in core).
- **Approach:** `PUT`/`POST` action per link runs bounded `fetch`; writes `links.display_title`, `links.target_preview` (JSONB keys: `title`, `description`, `imageUrl`, `siteName`), `preview_fetched_at`.
- **`target_preview` shape** is frozen once shipped (keys above; camelCase).

## Public Contract

### Portal HTTP

| Method | Path | Body | Outcome |
|--------|------|------|---------|
| `POST` | `/api/link-preview` | `application/x-www-form-urlencoded` **`id`** = link UUID | `303` → `/` or `/links/[id]/edit?preview=ok \| error`; runs unfurl for that row’s `destination_url`. |

Edit + New forms: **`button name="preview"`** or separate **“Fetch preview”** control posting same endpoint.

### `target_preview` JSON (stored)

```json
{ "title": "string?", "description": "string?", "imageUrl": "string?", "siteName": "string?" }
```

### List UI (**R-025**)

- Each row/card reads **only** DB fields; renders placeholder when `target_preview` null.
- **`og:image`**: `<img loading="lazy" referrerpolicy="no-referrer" />` sized per design tokens; **`https` img only** preferred — if stored `imageUrl` is `http`, render or upgrade per SECURITY note in implement.

### Migrations (**if expiry not already in UI**

- Columns `expires_at` already exist — **expose** `<input type="datetime-local">` or UTC text field normalized server-side.

## Test List

- [ ] **R-024** — SSRF-matrix: localhost / `10.x` literal URLs fail without egress (mock fetch).
- [ ] **R-024** — HTML fixture asserts OG / `<title>` / Twitter fallbacks persisted.
- [ ] **R-025** — list route invariant: HTTP mock egress count zero when only DB-seeded previews.
- [ ] Optional **R-026** — refresh clears stale `preview_fetched_at` and replaces JSON.
- [ ] Edge: oversized body truncation; redirect loop caps.

## Implementation Checklist

- [ ] OG/HTML parser pure unit tests (`packages/core` or portal `lib`)
- [ ] API route + wire forms
- [ ] List card layout + placeholders (design.md)
- [ ] `expires_at` form fields wired to Postgres
- [ ] Workflow 07 + Reality Check + `CHANGELOG`

## Out of Scope

- **R-027/R-028** notes markdown UX — **F-004**.
- Charts / Geo — **F-005/F-006**.
- CDN `CF-IPCountry` ingestion — backlog.

## Changelog Entry (draft)

- `F-003: Safe URL unfurl, list previews from DB, optional link expiry editing.`

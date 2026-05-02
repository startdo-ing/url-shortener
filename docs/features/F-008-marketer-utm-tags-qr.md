# F-008 — Marketer tooling (UTM · tags · QR)

- **Status:** done
- **Owner:** Operator (solo)
- **Linked requirements:** R-035, R-036, R-037
- **Linked ADRs:** [ADR 0001](../adr/0001-monorepo-two-apps-postgres.md) *(schema deltas)*
- **Depends on Q:** —
- **Estimated slices:** 2–3 *(shipped as one portal slice + migration)*

## Goal

Reusable **UTM templates** (R-035), **tags** on links + **search** over slug, destination, and tag names (R-036), and a deterministic **QR** resource per link (R-037).

## Schema

Migration **`packages/db/migrations/002_f008_utm_tags.sql`:**

- **`utm_templates`** — `name` (unique case-insensitive), optional `utm_source` … `utm_content`.
- **`tags`** — normalized lowercase `name` (unique, format check).
- **`link_tags`** — `(link_id, tag_id)` junction.

## Public Contract

### UTM (R-035)

| `GET` | `/utm` | List + create named templates |
| `POST` | `/api/utm-template-create` | Form: `name`, optional `utm_*` fields |
| `POST` | `/api/utm-template-delete` | Form: `id` |

On **create/update link**, optional form field **`utm_template_id`**. Server loads the template and merges non-empty `utm_*` into the destination URL via **`mergeUtmParamsIntoUrl`** (`@url-shortener/core`) before validation.

### Tags + search (R-036)

| `GET` | `/tags` | List tags with link counts; delete unused via form |
| `POST` | `/api/tag-delete` | Form: `id` |

Link forms: **`tags`** — comma-separated names (stored lowercase; invalid tokens dropped; max 24).

| `GET` | `/` | Query **`q`** — substring match on slug, destination URL, or tag name |

### QR (R-037)

| `GET` | `/api/links/[id]/qr.svg` | `image/svg+xml`; encodes **`${PUBLIC_SHORT_BASE_URL}/${slug}`** |

Requires **`PUBLIC_SHORT_BASE_URL`** (no trailing slash), e.g. `https://c.anh.pw`. If unset, returns **503** with plain text.

## Test List

- [x] **R-035** — `mergeUtmParamsIntoUrl` unit tests (`packages/core/src/utm-merge.test.ts`).
- [x] **R-036** — `parseTagNamesInput` unit tests (`apps/portal/src/lib/tag-input.test.ts`).
- [ ] **R-037** — golden SVG bytes (deferred; smoke via browser).

## Implementation Checklist

- [x] Migration `002_f008_utm_tags.sql`
- [x] Core merge helper + export
- [x] Portal marketer DB helpers (`apps/portal/src/server/marketer.ts`)
- [x] `createLink` returns `linkId` for tag attach after insert
- [x] `/utm`, `/tags`, home search, new/edit fields, QR route
- [ ] NDJSON export variant — out of scope (JSON array used elsewhere)

## Out of Scope

- Billing, multi-tenant presets.
- **Webhooks** (optional backlog).
- Real folder hierarchy for tags (spec’s `folder:*` convention deferred).

## Changelog Entry (draft)

- `F-008: UTM presets, link tags + list search, SVG QR per link (PUBLIC_SHORT_BASE_URL).`

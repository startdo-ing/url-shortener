# F-007 — Bulk paste import + CSV/JSON export

- **Status:** done
- **Owner:** Operator (solo)
- **Linked requirements:** R-029 (**Should**), R-030 (**Could**), R-020, R-021, R-005 *(reuse validations)*
- **Linked ADRs:** [ADR 0001](../adr/0001-monorepo-two-apps-postgres.md)
- **Depends on Q:** none
- **Estimated slices:** 1

## Goal

Paste **newline-separated URLs** (**optional** second column TAB/Comma slug) (**R-029** preview → commit UX); downloadable **CSV/JSON** snapshot of **`links`** + **click_count** rollup (**R-030** PRODUCT).

## Public Contract

### Import

| `GET` | `/links/bulk` | Explain + textarea |
| `POST` | `/api/bulk-links` | Form field **`csv`**; **`mode=preview`** (dry run) or **`mode=commit`**; or query **`dry_run=1`** for preview |

**Response:**

- **`303`** to `/links/bulk?…` with counts (**preview:** `dry=1`, `new`, `dup`, `bad`; **commit:** `created`, `skipped`, `failed`) + optional **`errs`** = base64url TSV (length-capped).

Validation per line: **`validateDestinationUrl`** + optional slug **`parseSlugInput`** (see `apps/portal/src/lib/bulk-parse.ts`). Commit loops **`createLink`** per row (no single transaction — partial success possible).

### Export

| `GET` | `/api/export-links-csv` | `Content-Disposition: attachment; filename="links.csv"` |
| `GET` | `/api/export-links-json` | JSON **array** of objects; `Content-Disposition: attachment; filename="links.json"` |

Rows: `slug`, `destination_url`, `status`, `redirect_type`, `created_at`, `updated_at`, `click_count` (LEFT JOIN aggregate on `click_events`).

## Test List

- [x] **R-029** — five-line malformed mid-row surfaces line number (`apps/portal/src/lib/bulk-parse.test.ts`).
- [ ] **R-030** — export golden bytes vs seeded DB (deferred; manual smoke OK).

## Implementation Checklist

- [x] Parser module + unit tests
- [x] Preview + commit API + bulk page
- [x] CSV/JSON export routes
- [ ] Single DB transaction for bulk commit — backlog (current: per-line `createLink`)

## Out of Scope

- **UI UTM presets** (**F-008**).
- **Async background job** importer — synchronous acceptable for solo scale.

## Changelog Entry (draft)

- `F-007: Bulk paste import with validation preview + CSV/JSON link export.`

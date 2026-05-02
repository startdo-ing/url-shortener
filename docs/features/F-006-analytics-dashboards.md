# F-006 — Portal analytics dashboards + maps + filters

- **Status:** done
- **Owner:** Operator (solo)
- **Linked requirements:** R-009, R-010, **R-011** (could)
- **Linked ADRs:** [ADR 0001](../adr/0001-monorepo-two-apps-postgres.md) *(schema sharing)* · **ADR 0003** dependency for enrichment data
- **Depends on Q:** *(none mandatory — requires **F-005** data fidelity for full value)*
- **Estimated slices:** 2 *(split charts vs maps via `split-feature` if invariant fails)*

## Goal

Operator answers “**how many clicks, from where, on what devices**?” with **portal pages**: global + per-link views, calendar range picker, dimensional tables, **country choropleth** (**R-010**), bot filter (**R-011**) — **`design.md` palette** (#6F7478 tertiary chart neutrals).

## Design Notes

- **Queries** run **read-only Postgres** aggregates — no async jobs in MVP.
- **Chart library**: pick ONE (e.g. lightweight SVG or **Chart.js** themable) — document license + bundle size in Reality Check (**ADR candidate** only if contentious).

## Public Contract

### Portal routes

| `GET` | Path | Purpose |
|-------|------|---------|
| | `/analytics` | Global summary + breakdowns across all links (`link_id IS NOT NULL`). |
| | `/analytics/[slug]` | Scoped to one link’s `click_events` (slug must exist). |

### Query params (frozen at implement)

- `from` **`YYYY-MM-DD`** UTC date inclusive
- `to` **`YYYY-MM-DD`** UTC date **inclusive** (same calendar day rule as `from`, using `(occurred_at AT TIME ZONE 'UTC')::date`).
- `human` **`1`|`0`** — when `human=1` filter `is_bot=false` (**R-011**)

### Map contract (**R-010**)

Choropleth aggregation: `GROUP BY country_code` with unknown bucket `??`. SVG or canvas — **never** leaks individual IP rows in UI tooltip (country-level only in v1).

## Test List

- [ ] **R-009** — seeded aggregates vs SQL golden counts fixture.
- [ ] **R-010** — map data JSON matches seeded `country_code`.
- [ ] **R-011** — totals delta when human filter toggled.
- [ ] Empty states (no clicks) graceful.

## Implementation Checklist

- [ ] SQL views or parameterized queries (**no string concat** IDs)
- [ ] Pages + visuals + THEMED CSS vars
- [ ] Manual snapshot / Playwright stub optional
- [ ] CHANGELOG

## Out of Scope

- Real-time streams; exporting analytics CSV (**F-007** overlaps — cross-link exports).
- **Point/LatLon** maps — stretch only.

## Changelog Entry (draft)

- `F-006: Portal analytics dashboards, geo choropleth, human/bot filter.`

## Reality Check (frozen)

- **Routes:** `GET /analytics` (global), `GET /analytics/[slug]` (per link; unknown slug ⇒ **404**).
- **Range:** `from` / `to` **`YYYY-MM-DD` UTC calendar dates**, both **inclusive**; default window **14 days** ending today UTC; max span **`MAX_ANALYTICS_RANGE_DAYS`** (400) — see `apps/portal/src/server/analytics.ts`.
- **Human filter:** query `human=1` or `human=true` ⇒ `is_bot = false` in SQL; `human=0` = all traffic (**R-011**).
- **Charts:** **no Chart.js** in v1 — CSS bar strip per day + **country density grid** (`color-mix` + `??` unknown) + tables (**design.md** neutrals / `--tertiary`).

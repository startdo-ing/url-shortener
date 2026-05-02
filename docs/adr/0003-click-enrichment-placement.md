# ADR 0003 — Click row enrichment (geo / UA / bot) placement

## Status

Accepted

## Context

**R-008** requires optional enrichment of `click_events` without violating **R-006** (redirect must not depend on analytics persistence success or heavy work on the hot path).

## Decision

1. **Phase A (F-005 minimum):** After `click_events` **insert** of the minimal row (**R-007**), run enrichment in the **same process** as `apps/redirect` **asynchronously** (`queueMicrotask` / background promise) that **UPDATE**s the same row by `id` when `id` is returned from `INSERT … RETURNING id` — or insert NULLs first then update. If UPDATE fails, **do not** affect the already-sent redirect.
2. **UA / bot:** Deterministic library (e.g. `ua-parser-js` or equivalent) populates `browser`, `os`, `device_type`, `is_bot` from `user_agent` string only.
3. **Geo:** **Offline** MaxMind **GeoLite2**-style DB (or operator-chosen equivalent) loaded **once** at process start from path **`GEOIP_CITY_DB`** env (optional — if unset, geo columns stay NULL). Lookup uses client IP inet from row; failures leave NULL.
4. **`raw_headers`:** Gated by **Q-003** / env **`RAW_HEADERS_ENABLED`** per [ARCHITECTURE.md](../../ARCHITECTURE.md); defaulted **off**.

## Alternatives considered

1. **Separate worker process / queue (Redis)** — preferred at scale; adopt when ingest volume or CPU proves too high on redirect replicas.
2. **Synchronous enrichment before INSERT** — rejected: adds tail latency variance on **R-001**.

## Consequences

- Schema already includes nullable enrichment columns (**F-001** migration).
- Integration tests **mock** geo DB or fixture IP→geo map; no live GeoIP downloads in CI.

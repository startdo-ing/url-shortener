# F-001 — Redirect core

- **Status:** done
- **Owner:** Operator (solo)
- **Linked requirements:** R-001, R-002, R-003, R-004, R-006, R-007
- **Linked ADRs:** [ADR 0001](../adr/0001-monorepo-two-apps-postgres.md)
- **Depends on Q:** *(none — Q-001..Q-004 use **interim** defaults pinned in [`ARCHITECTURE.md`](../../ARCHITECTURE.md); not treated as blocking for this slice)*  
- **Estimated slices:** 1
- **Actual slices:** 1

## Goal

Visitors hitting **`GET /<slug>`** on the redirect deploy receive **301 or 302** to the saved destination when the link exists and policy allows redirects; otherwise a **single class of 404** without internal leaks. Each eligible hit **records minimal click attribution** asynchronously so redirect still succeeds if persistence fails (**[R-006](../REQUIREMENTS.md)**).

*(Note: six linked `R-*` ids—one cohesive deployable / one HTTP boundary; splitting would orphan untestable redirect halves.)*

## Consistency Invariant Check

Run before workflow 05.

- [x] Every behavior in the public contract has a matching requirement id with acceptance criteria.
- [x] Every architectural choice is in `ARCHITECTURE.md` or has an ADR.
- [x] Every linked requirement links a pillar in [`docs/PRODUCT.md`](../PRODUCT.md).
- [x] No undecided `Q-*` is listed under **Depends on Q** _(interim Q defaults live in ARCHITECTURE only)._

## Design Notes

- **Layers:** `apps/redirect` (HTTP), `packages/db` (migrations + shared SQL types or query helpers), `packages/core` (slug/path policy as pure helpers only—no I/O).
- **Approach:** Bun `serve` listens on configurable `HOST`/`PORT`; one route resolves slug → DB read → Location; `queueMicrotask` (or equivalent “after response” primitive documented in impl) attempts `INSERT click_events`; double `TRUST_PROXY_HOPS` / trust rules from ARCHITECTURE.
- **Risks:** Bun “respond then write” ordering must be verified for **R-006**; use integration test with stalled/failing adapter.

## Public Contract

### HTTP — `apps/redirect`

| Method | Path | Success | Failure |
|--------|------|---------|---------|
| `GET` | `/healthz` | `200`, body plain text **`ok`** | — |
| `GET` | `/<slug>` | See matrix below | See matrix |

**Slug grammar (R-003, ARCHITECTURE):** `slug` is exactly one URL path segment matching `^[a-zA-Z0-9_-]{1,128}$` **after** percent-decoding. Any other path shape (multiple segments `foo/bar`, empty, characters outside grammar) ⇒ **same 404 envelope as unknown slug**.

**Redirect matrix (single active link row):**

| Link state | `expires_at` | HTTP | Headers |
|------------|--------------|------|---------|
| `active`, `302` configured | NULL or future | `302` | `Location: <destination_url exactly as stored after DB read>` |
| `active`, `301` configured | NULL or future | `301` | Same `Location` rule |
| `paused` OR `expires_at` in the past\* | — | `404` | No `Location`; body optional empty or static short plain **`Not Found`** |

\* **Time comparison:** `expires_at <= transaction_timestamp()` (UTC) ⇒ expired.

**404 envelope (unknown slug OR grammar fail OR paused OR expired — R-002 class):**

- Status **`404`**
- Body: **optional** minimal plain text **`Not Found`** (exact string) or empty body—pick one implementation-wide and freeze in tests.
- **No** `Location` header.
- Headers MUST NOT expose stack traces **or Postgres** error strings.

**Forwarded client IP (instrumentation contract):**

- If `TRUST_PROXY_HOPS` env is **`0`** (default): use socket remote address semantics Bun exposes for the inbound connection (`request` API TBD in code, pinned in Reality Check once).
- If `TRUST_PROXY_HOPS >= 1`: parse **`X-Forwarded-For`** from the right-most trusted hops only; malformed header ⇒ fall back to direct IP without throwing *(still return redirect/closing outcomes)*.

**Click row fields persisted (R-007), when redirect was “eligible”** (successful 301/302 row above):

| Column | Value |
|--------|--------|
| `link_id` | UUID FK `links.id` |
| `occurred_at` | `now()` UTC |
| `ip` | derived per IP contract; nullable allowed if unresolved |
| `referrer` | raw `Referer` header absent → NULL |
| `user_agent` | raw `User-Agent` header absent → NULL |
| `accept_language` | raw `Accept-Language` header absent → NULL |
| geo / enriched columns | present in schema — **omit population** this feature (defer **R-008**); MUST default NULL / false |

**R-006 contract:** Injecting a failing `INSERT` for `click_events` MUST NOT change status/headers of the redirect response versus success path *(same observable `301`/`302` + `Location`)*.

---

### PostgreSQL — migration `001_redirect_core.sql`

**Table `links`**

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | `PRIMARY KEY` |
| `slug` | `text` | `NOT NULL UNIQUE` |
| `destination_url` | `text` | `NOT NULL` |
| `display_title` | `text` | nullable |
| `target_preview` | `jsonb` | nullable |
| `preview_fetched_at` | `timestamptz` | nullable |
| `redirect_type` | `smallint` | `NOT NULL CHECK (redirect_type IN (301,302))` |
| `status` | `text` | `NOT NULL CHECK (status IN ('active','paused'))` |
| `expires_at` | `timestamptz` | nullable |
| `notes_markdown` | `text` | nullable |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` |

**Table `click_events`**

| Column | Type | Notes |
|--------|------|------|
| `id` | `bigserial` | PK |
| `link_id` | `uuid` | `NOT NULL REFERENCES links(id) ON DELETE CASCADE` |
| `occurred_at` | `timestamptz` | `NOT NULL DEFAULT now()` |
| `ip` | `inet` | nullable |
| `referrer` | `text` | nullable |
| `user_agent` | `text` | nullable |
| `accept_language` | `text` | nullable |
| `country_code` | `char(2)` | nullable *(unused F-001)* |
| `region`, `city` | `text` | nullable |
| `latitude`, `longitude` | `double precision` | nullable |
| `browser`, `os`, `device_type` | `text` | nullable |
| `is_bot` | `boolean` | `NOT NULL DEFAULT false` |
| `raw_headers` | `jsonb` | nullable *(default off ARCH; store NULL)* |

**Indexes**

- `click_events_link_id_occurred_at_idx` on `(link_id, occurred_at DESC)`
- Partial index per PRODUCT_PLAN for `country_code` **optional** in this migration or deferred—acceptable to defer partial until **R-008** lands.

---

### Typescript — `packages/core` exported surface

```ts
// contracts only — signatures finalized at implement if names differ slightly
export const SLUG_SEGMENT_PATTERN: RegExp;
export function isAllowedSlugSegment(pathSegment: string): boolean;
/** Returns true only for single-segment pathname like "/abc"; false for "/", "/a/b". */
export function parseSingleSlugPath(urlPathname: string): boolean;
```

*`packages/core` MUST NOT open sockets; unfurl/markdown live out of scope.*

*(Implemented names: `parseSingleSlugSegment` returns `string | null`; spec name drift accepted in FEATURE.)*

---

## Test List

- [x] **R-003 + R-002** — `G/W/T`: malformed path `/ab/cd` ⇒ `404`; `/bad slug` ⇒ `404` (unless encoded slug valid); violates charset ⇒ `404`.
- [x] **R-002** — unknown existing grammar slug ⇒ `404`, body policy frozen, assert no `internal` wording.
- [x] **R-001** — seeded `active`, `expires_at NULL`, temp vs perm rows ⇒ `302`/`301` + matching `Location`.
- [x] **R-004** — frozen `paused` row ⇒ `404`; active row with past `expires_at` ⇒ `404`.
- [x] **R-006** — `INVARIANT`: click insert failure ⇒ redirect outcome unchanged versus insert success _(same status + Location)_.
- [x] **R-007** — after eligible hit with stub adapter capturing insert payloads, asserted row carries link id + header triple + IP fixture (frozen clock fixtures; no net).
- [x] **healthz** — `200 ok` deterministic.
- [x] edge: empty `slug` segment path `GET /` — `404` or non-redirect *(document choice; MUST NOT throw)*.
- [x] edge: `TRUST_PROXY_HOPS` with synthetic `X-Forwarded-For` golden vector.

---

## Implementation Checklist

- [x] Failing integration/contract tests (workflow **05**) for matrix above _(no cheating on ordering)_ — satisfied via **`FakeDeps`** contract tests (**R-007**/`R-006` ordering).
- [x] Root Bun workspace scaffold (`package.json` workspaces declaration).
- [x] `packages/core` slug helpers + unit tests (regex table-driven).
- [x] `packages/db` migration + minimal seed helper SQL fixture for CI only.
- [x] `apps/redirect` Bun server wiring + Postgres pool config via `DATABASE_URL`.
- [x] Click insert async path + injectable repo for failure test.
- [x] `.env.example` keys: `DATABASE_URL`, `HOST`, `PORT`, `TRUST_PROXY_HOPS`.
- [x] `CHANGELOG.md` draft line (on done): `F-001: Bun redirect core with Postgres-backed slugs…`
- [x] refactor & prune (workflow **07**) — deps minimal; slug logic single place
- [x] Reality Check fingerprint before **`done`**
- [ ] workflows **09** when automated traceability expands beyond `tools/audit.sh`

---

## Out of Scope (*deferred*)

| Deferred | Where |
|----------|-------|
| Operator portal UI (**R-020+** …), markdown, unfurl, design tokens | **`F-00x` future** · [PRODUCT_PLAN](../PRODUCT_PLAN.md) Phase 1 portal |
| destination URL validation (**R-005**) at author layer | Until portal/feature creates links via app — seed/SQL OK for tests only |
| Enriched click (**R-008**), aggregates/maps (**R-009–R-011**) | **F-00x** |
| Structured export & bulk (**R-029**) | backlog / later `F-*` |
| `raw_headers` population when env flag enabled | **Q-003** + later slice |
| In-app authentication | ARCHITECTURE + Phase 4 |

---

## Lessons / Surprises *(fill during impl)*

- `queueMicrotask` after building `Response` keeps **R-006** observable in tests with `flushMicrotasks()`.
- Local `db:migrate` requires a reachable Postgres; docker CLI was absent in this WSL image—smoke against real DB is operator-side.

## Red-Team Pass *(filled by `red-team-self` skill before declaring done)*

- FM1: **Location header** — uses raw `destination_url` string, not `Response.redirect`, to avoid URL normalization drift vs **R-001** “exactly as stored.”
- FM2: **Expired edge** — `expires_at.getTime() <= now` matches interim “≤ now” policy; boundary tested.
- FM3: **POST /** — returns 404 (non-GET not required by spec for redirect host); acceptable until portal shares origin.

## Reality Check (final)

```
$ cd /home/anhpw/startdo.ing/url-shortener && bun test
bun test v1.3.13 (bf2e2cec)
…
 22 pass
 0 fail
…

$ ./tools/audit.sh F-001
audit F-001 OK (minimal traceability grep)

→ state after: all contract tests green; FakeDeps covers redirect + microtask ordering
→ expected:    F-001 public HTTP + slug + click enqueue behavior per matrix
→ match:       yes
→ fingerprint: date -Is ⇒ 2026-05-01T11:36:37+00:00; docker unavailable here so Postgres end-to-end insert not exercised in this run (operator: `docker compose up -d`, `bun run db:migrate`, insert seed row, `bun run redirect` + curl)
```

Git SHA recorded after first commit on `feat/f-001-redirect-core` (populate with `git rev-parse HEAD` post-merge locally).

---

## Abandonment *(omit unless Status: abandoned)*

---

## Changelog Entry (draft)

- `F-001: Postgres-backed slug redirects with minimal async click logging.`

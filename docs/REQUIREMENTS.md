# Requirements

**ID scheme:** flat `R-NNN` (stable forever; never reuse; retire in place).

**Upstream:** [PRODUCT.md](./PRODUCT.md). **Deep context:** [PRODUCT_PLAN.md](./PRODUCT_PLAN.md).

Pillar column: **1** = Fast dumb redirect · **2** = Forensic click signal · **3** = Operator clarity.

---

### R-001 — Active slug redirects

- **Priority:** Must  
- **Pillar:** 1  
- **Statement:** When a visitor requests `GET /<slug>` and the slug identifies an **active** link whose policy allows redirect, the system responds with the configured redirection status and a `Location` equal to that link’s stored destination URL.

- **Acceptance (G/W/T):**
  - Given an active link with destination `https://example.com/x` and redirect type permanent, When a client requests `GET /<slug>` without side-channel errors, Then the response status is redirect-class and `Location` is `https://example.com/x`.
  - Given an active link configured for temporary redirect, When the same request occurs, Then the response uses the temporary redirect semantics required by policy.

- **Cross-refs:** Depends on paused/expired semantics **R-004** / **Q-001**, **Q-002**.

- **Notes:** Hostnames (`c.anh.pw`) are deployment; acceptance is behavior-level.

---

### R-002 — Unknown slug does not leak internals

- **Priority:** Must  
- **Pillar:** 1  
- **Statement:** When `GET /<slug>` does not match any link, the system returns a unified “not found” outcome without exposing stack traces or internal identifiers.

- **Acceptance:**
  - Given no link row exists for slug `abc`, When `GET /abc`, Then status and body match the chosen not-found behavior (pinned in architecture or ADR once fixed) and no internal error strings appear in the entity body.

---

### R-003 — Malformed slug path is rejected safely

- **Priority:** Must  
- **Pillar:** 1  
- **Statement:** Requests whose path cannot constitute a valid public slug shape are rejected with the same class of outcome as unknown slugs (or documented stricter subset), without invoking link lookup.

- **Acceptance:**
  - Given a documented invalid pattern (nested path, forbidden characters once policy exists), When requested, Then response is consistent with **R-002** class unless an ADR mandates `400`; policy must be deterministic.

---

### R-004 — Paused / expired links deny redirect per policy

- **Priority:** Must  
- **Pillar:** 1, 3  
- **Statement:** When a slug exists but the link status or datetime policy forbids redirects, visitors do not receive a successful redirect to the destination.

- **Acceptance:**
  - **Interim policy:** paused or expired (when `expires_at` enforced) returns **`404`** aligned with unknown slug class; see [ARCHITECTURE.md](../ARCHITECTURE.md) § Behavioral defaults and [open-questions.md](./open-questions.md) **Q-001** / **Q-002** (`interim`).
  - When product closes Q-001/Q-002 with a different matrix, update ARCHITECTURE + this acceptance together.

---

### R-005 — Forbidden destination schemes cannot be saved

- **Priority:** Must  
- **Pillar:** 1, 3  
- **Statement:** The operator cannot persist a destination URL whose scheme/path is forbidden (e.g. `javascript:`), including on create and update paths.

- **Acceptance:**
  - Given a destination `javascript:alert(1)`, When save is attempted, Then the UI shows a refusal and persistence does not succeed.
  - Given `https:` allowed destination, When save succeeds, Then redirect (**R-001**) can legally point there.

---

### R-006 — Redirect is not gated on analytics write success

- **Priority:** Must  
- **Pillar:** 1, 2  
- **Statement:** A redirect-eligible response is returned even if persistence of click data fails transiently.

- **Acceptance (invariant):** Under deterministic test doubles that force click persistence failure, When `GET /<slug>` hits an otherwise active link, Then the redirect response still satisfies **R-001** acceptance; click side-effect may observably omit or enqueue.

---

### R-007 — Minimal click attribution per hit

- **Priority:** Must  
- **Pillar:** 2  
- **Statement:** On each tracked hit for a redirect-eligible slug, the system records an append-only event associating slug/link identity, occurrence time (UTC), client IP (as seen by trusted proxy rules), Referer header if present, User-Agent header if present, and Accept-Language header if present.

- **Acceptance:**
  - Given simulated request fixtures with populated headers and IP derivation, When a hit is processed through the attribution path under test harness, Then a persisted or enqueued artifact contains exactly those semantic fields mapped to stable schema names (frozen in ARCHITECTURE or feature spec).

- **Cross-refs:** **R-006** concurrency.

---

### R-008 — Optional richer enrichment on click rows

- **Priority:** Should  
- **Pillar:** 2  
- **Statement:** When enrichment is configured/available (GeoIP dataset, UA parser), click events additionally store subdivision-level geo fields, parsed OS/browser/device, and bot classification where deterministic.

- **Acceptance:**
  - Given synthetic fixture IP/UA mappings in tests (no live network), When ingestion runs enrichment path, Then stored artifact fields match fixtures.

---

### R-009 — Aggregate analytics slices in portal

- **Priority:** Should  
- **Pillar:** 2, 3  
- **Statement:** The operator views click totals over a selectable calendar range, time bucketing appropriate to span, dimensional breakdown tables (devices, referrer top-N once data exists), excluding UI framework-specific layout.

- **Acceptance:**
  - Given seeded `click_events` with known timestamps and dimensions under test doubles, When the portal analytics view for that slug or global scope loads, Then counts match fixture expectations within one screen’s scope.

---

### R-010 — Geographic map summaries

- **Priority:** Should  
- **Pillar:** 2, 3  
- **Statement:** The portal visualizes aggregated clicks by geo dimension appropriate to Phase 2 (minimum: country rollup; region/city as data fidelity allows).

- **Acceptance:**
  - Given fixture events with `{country_code, region?}`, When map summary renders, Then aggregate totals match seeded sums for each rendered region tier.

---

### R-011 — Bot-inclusive vs human-only aggregates

- **Priority:** Could  
- **Pillar:** 2, 3  
- **Statement:** When bot flag stored, aggregates may filter to approximate human traffic versus all traffic.

- **Acceptance:**
  - Given mixed bot/non-bot fixture clicks, When filter toggled, Then displayed totals change by expected delta.

---

### R-020 — Operator creates managed short links

- **Priority:** Must  
- **Pillar:** 3  
- **Statement:** The operator persists a destination URL (`R-005` satisfied) with slug either randomly generated **or** operator-provided according to uniqueness rules (**R-021**).

- **Acceptance (G/W/T):**
  - Given destination `https://a.example`, When submit create with “random slug” intent, Then a persisted link exists whose slug conforms to advertised charset/length bounds and redirects per **R-001**.
  - Given slug `myslug` unused, When submit with that slug and valid destination, Then creation succeeds once.

---

### R-021 — Slug collisions are prevented

- **Priority:** Must  
- **Pillar:** 3  
- **Statement:** No two persisted links share the same slug simultaneously.

- **Acceptance:**
  - Given slug `dup` occupied, When create proposes `dup`, Then operator-visible error and persistence rejected.

---

### R-022 — Operator updates editable link fields

- **Priority:** Must  
- **Pillar:** 3  
- **Statement:** The operator edits destination URL, redirect type, display title notes markdown and status toggles surfaced by UX without orphaned rows.

- **Acceptance:**
  - Given persisted link `L`, When destination updated to compliant URL, Subsequent **R-001** uses new destination.
  - When redirect mode toggled between permanent vs temporary semantics, Subsequent responses match.

---

### R-023 — Operator removes links from resolution

- **Priority:** Must  
- **Pillar:** 3  
- **Statement:** Deleting or retiring a slug stops future redirects for **R-001** equivalence class (typically **R-002** thereafter).

- **Acceptance:**
  - Given persisted link slug `gone`, When delete completes, Subsequent `GET /gone` matches unknown slug semantics.

---

### R-024 — Safe unfurl ingest for portal preview

- **Priority:** Must  
- **Pillar:** 3  
- **Statement:** On operator action “Fetch / refresh from destination URL,” the portal runs a bounded SSRF-aware fetch pipeline that updates `display_title` and persisted `target_preview` fields when reachable, otherwise records failure state without poisoning redirect metadata.

- **Acceptance:**
  - Given SSRF-fixture localhost URL, When triggered, Then fetch does not egress or store success where forbidden rules say block.
  - Given HTML fixtures with OG fields, When triggered, persistence contains matching title/description/image keys per ARCHITECTURE.

---

### R-025 — Index lists destination cues from persistence

- **Priority:** Must  
- **Pillar:** 3  
- **Statement:** The link listing reads denormalized preview fields from persistence only—it does **not** perform per-row outbound HTTP fetch.

- **Acceptance (invariant):** Under deterministic network mocks showing zero egress from list route, listings still render placeholders or stored preview fields seeded in DB fixtures.

---

### R-026 — Operator may refresh stale preview explicitly

- **Priority:** Could  
- **Pillar:** 3  
- **Statement:** UI exposes explicitly invoked re-run of unfurl ingest per link (**R-024**).

---

### R-027 — Markdown notes with Write and Preview modes

- **Priority:** Must  
- **Pillar:** 3  
- **Statement:** Notes field supports markdown source editing with sanitized rendered preview reflecting at least headings bold italic inline code fences links lists quotes tables subset per PRODUCT_PLAN; raw HTML injections do not execute as markup.

- **Acceptance:**
  - Given textarea content with `<script>...</script>` or inline event handlers embedded in naive markdown pipelines, rendered preview escapes or strips hostile output per CSP/sanitizer contract (asserted golden DOM or AST strings).
  - Given GFM-ish table markdown fixture, Preview matches expected structure.

---

### R-028 — Notes excerpt clamp and full-screen overlay entry

- **Priority:** Must  
- **Pillar:** 3  
- **Statement:** Link index shows textual excerpt capped to few lines visually; overlay entry (**Q-004**) shows full sanitized markdown scrolling.

- **Acceptance:**
  - Given markdown longer than excerpt budget, listing row clamps visual lines (observable harness or screenshot-free DOM assertions).
  - When “view full,” overlay contains full sanitized output and dismisses safely (focus return stubbed accessibility checks where feasible).

---

### R-029 — Bulk URL creation from paste bundle

- **Priority:** Should  
- **Pillar:** 3  
- **Statement:** Operator pastes newline-separated URLs (optional extra column for slug shape per PRODUCT_PLAN) and submits; system validates rows and reports successes vs failures deterministically prior to finalize.

- **Acceptance:**
  - Given pasted five-line batch with line 3 malformed, preview step reports line 3 error and does not silently drop without operator acknowledgment.

---

### R-030 — Structured export snapshot

- **Priority:** Could  
- **Pillar:** 3  
- **Statement:** Operator exports CSV or JSON summarizing stored links plus aggregate totals where export exists—format pinned in ARCHITECTURE.

---

### R-031 — Portal obeys product surface design veto

- **Priority:** Must  
- **Pillar:** 3  
- **Statement:** Portal screens referencing design baseline use typography palette and accent rules from [`design.md`](../design.md): single tertiary accent drives one primary destructive/success action per coherent view; layouts stay flat gradient-free on primary surfaces unless chart library requires distinct series encoding.

- **Acceptance:**
  - **Manual / checklist:** PR template or scripted style token smoke (exact automation optional)—document verifier in ARCHITECTURE; until then reviewer marks compliance.

---

### R-032 — Separate hosts for redirect vs portal

- **Priority:** Must  
- **Pillar:** 1, 3  
- **Statement:** Deployment documentation prescribes divergent origins for redirect and portal so admin cookies/session surface never overlaps click domain semantics.

- **Acceptance:**
  - Document-only for this artifact; superseded explicit env names live in ARCHITECTURE/ADR once repo exists.

---

### R-033 — Machine API for links (API keys)

- **Priority:** Should *(Phase 4 — [PRODUCT_PLAN.md](./PRODUCT_PLAN.md) §7)*  
- **Pillar:** 3  
- **Statement:** Authorized clients authenticate with **API keys** (`Authorization: Bearer …`) issued by the portal and perform link CRUD and read aggregates on versioned **`/api/v1/*`** JSON routes on the **portal origin**; the redirect host remains **`GET /<slug>`** + **`/healthz`** only (**R-032**).

- **Acceptance:**
  - Given a missing or revoked key, When `POST /api/v1/links`, Then **`401`** JSON body with stable `{ "error": "unauthorized" }` (exact schema frozen in [F-009](./features/F-009-api-and-auth.md) at implement).
  - Given valid key and body satisfying **R-005**, When create, Then persisted row matches portal parity rules in **F-009** contract.

---

### R-034 — In-app portal authentication (sessions)

- **Priority:** Should *(Phase 4 — replaces or augments deployment-only gate when enabled)*  
- **Pillar:** 3  
- **Statement:** When enabled (env **`AUTH_MODE`** or equivalent **pinned in ARCHITECTURE** at ship), browser traffic to portal management routes requires an authenticated session in addition to optional API keys.

- **Acceptance:**
  - Given anonymous browser `GET /` while auth required, When no session, Then **`302`** to login route (path frozen in implement) without listing links in HTML.
  - Given successful login, When `GET /`, Then listings render.

---

### R-035 — UTM presets

- **Priority:** Should *(Phase 3 — [PRODUCT_PLAN.md](./PRODUCT_PLAN.md) §4.5)*  
- **Pillar:** 3  
- **Statement:** Operator defines named UTM parameter bundles and applies one on link create/update so the destination URL gains deterministic query parameters.

- **Cross-refs:** [F-008](./features/F-008-marketer-utm-tags-qr.md).

---

### R-036 — Tags and search across links

- **Priority:** Should  
- **Pillar:** 3  
- **Statement:** Operator assigns **tags** to links (many-to-many) and finds links via search over slug, destination, and tag names.

- **Cross-refs:** [F-008](./features/F-008-marketer-utm-tags-qr.md).

---

### R-037 — QR artefact per link

- **Priority:** Could  
- **Pillar:** 3  
- **Statement:** Each link exposes a deterministic **QR** resource (SVG **or** PNG — one format in v1 per **F-008** contract) encoding the canonical public short URL.

- **Cross-refs:** [F-008](./features/F-008-marketer-utm-tags-qr.md).

---

## Pillar coverage audit

| Pillar | Must ids |
|--------|----------|
| 1 | R-001, R-002, R-003, R-004, R-005, R-006, R-032 |
| 2 | R-007 (+ R-006 shared) |
| 3 | R-020, R-021, R-022, R-023, R-024, R-025, R-027, R-028, R-031 (+ shared R-004,R-005); phased **R-033–R-037** → [F-008](./features/F-008-marketer-utm-tags-qr.md) / [F-009](./features/F-009-api-and-auth.md) |

Each pillar has ≥ one Must behavioral owner.

---

## Automated test traceability

Paths are repo-relative. Run **`bun test`** at the workspace root.

| Requirement | Primary unit tests (`bun:test`) | Notes |
|---------------|----------------------------------|-------|
| R-001 | `apps/redirect/src/handler.test.ts` | 301/302 + `Location` |
| R-002 | `apps/redirect/src/handler.test.ts`, `packages/core/src/index.test.ts`, `apps/portal/src/server/analytics-bundle.test.ts` (unknown slug path) | No internal leak strings |
| R-003 | `apps/redirect/src/handler.test.ts`, `packages/core/src/index.test.ts` | Malformed slug / segment rules |
| R-004 | `apps/redirect/src/handler.test.ts` | Paused / expired → 404 |
| R-005 | `packages/core/src/url.test.ts`, `apps/portal/src/server/mutations-preflight.test.ts` | Saves reject forbidden schemes |
| R-006 | `apps/redirect/src/handler.test.ts` | Insert/enrich failures do not block redirect |
| R-007 | `apps/redirect/src/handler.test.ts`, `apps/redirect/src/ip.test.ts` | IP + headers on insert; XFF derivation edge |
| R-008 | `apps/redirect/src/enrich-click.test.ts` | UA/bot/geo fixtures (no live network) |
| R-009 | `apps/portal/src/server/analytics-params.test.ts`, `apps/portal/src/server/analytics-bundle.test.ts` | Range parsing + mocked SQL bundle assembly |
| R-010 | `apps/portal/src/server/analytics-params.test.ts` | `countryRollupToMap` |
| R-011 | same as R-009 (`parseAnalyticsSearchParams`, `humanOnly` bundle parity) | |
| R-020 | `packages/core/src/slug-input.test.ts`, `packages/core/src/slug-gen.test.ts`, `apps/portal/src/server/mutations-preflight.test.ts` | Custom + random slug grammar |
| R-021 | `apps/portal/src/server/mutations-preflight.test.ts` (`postgresUniqueViolation`), `apps/portal/src/server/api-keys.ts` (uses shared helper for prefix collisions) | Full duplicate-slug UX still DB-backed outside unit scope |
| R-022 | `apps/portal/src/server/mutations-preflight.test.ts` (`preflightUpdateLink`, `parseExpiresAtForm`) | Persistence path uses same validators |
| R-023 | `apps/portal/src/server/requirements-fixtures.test.ts`, **`apps/portal/src/server/portal.integration.test.ts`** (opt-in) | Unit: `DELETE … RETURNING` in `mutations.ts`; **`bun run test:integration`** exercises v1 DELETE + follow-up GET 404 |
| R-024 | `packages/core/src/ssrf-host.test.ts`, `packages/core/src/unfurl-meta.test.ts`, `apps/portal/src/server/unfurl-fetch.test.ts`, `apps/portal/src/server/link-preview-apply.test.ts` | |
| R-025 | `apps/portal/src/server/requirements-fixtures.test.ts` | `listLinks` path avoids `fetch(` |
| R-026 | `apps/portal/src/server/link-preview-apply.test.ts` | Refresh / apply pipeline with injected deps |
| R-027 | `apps/portal/src/lib/render-notes.test.ts` | Markdown + sanitization |
| R-028 | `apps/portal/src/lib/render-notes.test.ts` | Excerpt clamp |
| R-029 | `apps/portal/src/lib/bulk-parse.test.ts` | |
| R-030 | `apps/portal/src/server/export-format.test.ts` | Pure CSV/JSON shape from query rows |
| R-031 | `apps/portal/src/server/requirements-fixtures.test.ts` | Token smoke on `design.md`; full UX is reviewer checklist |
| R-032 | `apps/portal/src/server/requirements-fixtures.test.ts` | Doc anchor on architecture split |
| R-033 | `apps/portal/src/server/v1-http.test.ts`, `apps/portal/src/server/api-key-crypto.test.ts`, `apps/portal/src/server/api-keys-shape.test.ts`, **`apps/portal/src/server/portal.integration.test.ts`** (opt-in) | **`bun run test:integration`**: missing bearer, **revoked key**, and happy-path create (**`DATABASE_URL`** required) |
| R-034 | `apps/portal/src/server/session-gate.test.ts`, `apps/portal/src/middleware.ts`, **`apps/portal/src/server/portal.integration.test.ts`** (opt-in) | Unit: bypass paths; integration: Postgres session row lifecycle; **`302` login redirect** remains browser/middleware-shaped |
| R-035 | `packages/core/src/utm-merge.test.ts` | |
| R-036 | `apps/portal/src/lib/tag-input.test.ts` | Tag string parsing only; portal search SQL is integration-shaped |
| R-037 | `apps/portal/src/server/qr-target.test.ts` | Target URL encoding + deterministic SVG opts (`qrcode`) |

**Postgres integration (optional):** after applying migrations (`bun run db:migrate`), set **`DATABASE_URL`** and run **`bun run test:integration`** — see `apps/portal/src/server/portal.integration.test.ts` (**R-033**, **R-023**, **R-034** session persistence).

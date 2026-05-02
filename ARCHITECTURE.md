# Architecture

**Upstream:** [docs/PRODUCT.md](docs/PRODUCT.md), [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md). **Operational detail:** [docs/PRODUCT_PLAN.md](docs/PRODUCT_PLAN.md).

Baseline decision: **[ADR 0001](docs/adr/0001-monorepo-two-apps-postgres.md)** (monorepo, two Bun deployables, one Postgres).

**Further ADRs:** [0002](docs/adr/0002-unfurl-fetch-ssrf-boundaries.md) (unfurl / SSRF), [0003](docs/adr/0003-click-enrichment-placement.md) (click enrichment), [0004](docs/adr/0004-notes-markdown-sanitization.md) (notes Markdown). **Feature index:** [docs/features/README.md](docs/features/README.md).

---

## Runtime shape (planned)

| Path | Role |
|------|------|
| `apps/redirect` | Public `GET /:slug` only; resolves link rows; persists `click_events` without blocking redirect success ([R-006](docs/REQUIREMENTS.md)). |
| `apps/portal` | Astro + Svelte SSR (F-002: link CRUD; later unfurl/analytics); form posts to `/api/*`; `output: server`, `@astrojs/node` standalone. |
| `packages/core` | Pure validation, slug rules, shared types, optional Effect layers; **no** framework imports. |
| `packages/db` | Schema, migrations, shared query helpers (or equivalent single migration root—name may be `db/` if tooling prefers). |

---

## Dependency rules (machine-checkable intent)

1. **`packages/core` MUST NOT** import from `apps/*`, `packages/db` server drivers in “pure” modules, `astro`, `svelte`, or `react`.
2. **`packages/db` MAY** import `packages/core` for types only if needed; **MUST NOT** import `apps/*`.
3. **`apps/redirect` MAY** import `packages/core` and `packages/db` (or a thin `packages/db-client`); **MUST NOT** import `apps/portal` or UI frameworks.
4. **`apps/portal` MAY** import `packages/core` and `packages/db`; **MUST NOT** import `apps/redirect` source.
5. **Enforcement path:** add `dependency-cruiser` or `eslint-plugin-import` boundary rules in first CI slice; until then, review enforces.

---

## Behavioral defaults (interim; supersede when `Q-*` closed)

| Topic | Default | Trace |
|-------|---------|--------|
| Paused / expired slug ([Q-001](docs/open-questions.md), [Q-002](docs/open-questions.md)) | `404` with minimal body, **same class** as unknown slug ([R-002](docs/REQUIREMENTS.md)); no HTML marketing page in v1 unless product changes Q. | This section |
| `click_events.raw_headers` ([Q-003](docs/open-questions.md)) | **Off** unless `RAW_HEADERS_ENABLED=true` (or equivalent) in env; when on, whitelist keys and cap JSON size per [PRODUCT_PLAN](docs/PRODUCT_PLAN.md). | Env + ADR when finalized |
| Notes “view full” ([Q-004](docs/open-questions.md)) | **Modal dialog** default (focus trap, Escape dismiss, return focus). Drawer allowed only if a11y parity documented. | Portal implementer |

**Unknown / malformed slug ([R-002](docs/REQUIREMENTS.md), [R-003](docs/REQUIREMENTS.md)):** `404`, body empty or static short **plain text**; no JSON error envelopes on redirect app unless an ADR adds them.

**Slug grammar (until feature spec narrows):** single path segment `^[a-zA-Z0-9_-]{1,128}$` (adjust in `F-*` spec if product changes).

**Trusted proxy:** redirect app reads `X-Forwarded-For` (or platform-specific header) **only** when `TRUSTED_PROXY_CIDRS` / hop count configured; otherwise bind direct socket IP—document env in first deploy slice.

---

## Technology choices (concise rationale)

| Choice | Why |
|--------|-----|
| PostgreSQL | PRODUCT_PLAN; relational links + append-only clicks + aggregates. |
| Bun | Single runtime for both apps; fast cold start on redirect tier. |
| Astro + Svelte (portal) | PRODUCT_PLAN; islands/SSR separation from redirect. |
| Optional Effect (`packages/core`, portal services) | Typed errors/services without bloating redirect hot path. |
| Markdown | Sanitizer + GFM subset in portal only; library choice is `F-*` + ADR if contested. |

---

## Conventions

- **Language:** TypeScript; format with project formatter once `package.json` exists.
- **Tests:** `*.test.ts`; colocated next to unit under test unless `tests/integration/` required.
- **Time:** store `timestamptz` UTC; serialize ISO-8601 to UI.
- **IDs:** UUID v4/v7 for `links.id` unless ADR selects ULID.
- **Config:** `.env` not committed; use `.env.example` with dummy values only.
- **Commits:** `R-XXX` / `F-NNN` prefix per [vibe-coding/AGENT.md](vibe-coding/AGENT.md).
- **Error handling:** redirect path returns HTTP outcomes, not thrown stack traces to clients; portal maps domain errors to user-visible messages + logs server-side.

---

## Test pyramid

| Layer | Scope | Speed target | Catches |
|-------|--------|--------------|---------|
| Unit | `packages/core` validators, slug gen, URL policy, markdown sanitizer contracts | sub-second | Parse/validation regressions |
| Contract | Redirect handler with fake DB / in-memory repo | sub-second | Wrong status, Location, R-006 ordering |
| Integration | Real Postgres (container or tmp) + migrations | ~minutes | SQL, constraints, migration drift |
| E2E | Few Playwright (or similar) flows on portal + redirect | slow | Wiring, SSR, critical paths only |

**Determinism ([AGENT.md](vibe-coding/AGENT.md) F):** no wall clock in unit/contract; no live network—HTML fixtures and recorded responses for unfurl tests.

---

## Cross-cutting (pointers)

- **SSRF / unfurl:** implemented only in portal (or `packages/core` pure parse + portal network adapter); never in redirect.
- **GeoIP / enrichment:** async post-insert or background-friendly path; MUST NOT block [R-001](docs/REQUIREMENTS.md).
- **Auth:** none in app v1; edge/VPN/basic-auth at deploy—document in runbook when repo has deploy files.

---

## Drift

When a feature needs to break a rule here → update this file **and** add or amend an ADR; never merge silent exceptions.

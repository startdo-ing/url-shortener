# Production plan (vibe-coding spine + ops)

This document bridges **[PRODUCT_PLAN.md](./PRODUCT_PLAN.md)** (what to build and in what product phases) with the **[vibe-coding](../vibe-coding/AGENT.md)** execution model: spine artifacts, feature slices (`F-*`), workflows `01→…→09`, and **production readiness**.

**Roles**

| Artifact | Role |
|---------|------|
| [PRODUCT_PLAN.md](./PRODUCT_PLAN.md) | Authoritative **product/engineering spec**: hosts, phases, UX, schema intent, success criteria. |
| [PRODUCT.md](./PRODUCT.md) | **Veto document**: pillars — use for “does this slice strengthen a pillar?” |
| [REQUIREMENTS.md](./REQUIREMENTS.md) | Stable **`R-*`** behaviours + acceptance hooks for tests. |
| [ARCHITECTURE.md](../ARCHITECTURE.md) | Dependency rules, behavioural defaults, test pyramid. |
| [docs/features/README.md](./features/README.md) (`F-*`) | One **slice** each: contract, tests, checklist, Reality Check — unit of merge. |
| [open-questions.md](./open-questions.md), [backlog.md](./backlog.md), [adr/](./adr/) | Decide / defer / backlog / irreversible choices. |

**Workflow loop** (single entrypoint [vibe-coding/AGENT.md](../vibe-coding/AGENT.md)): classify request → load spine → invariant check → **`04-feature-spec`** → **`05-test-first`** → **`06-implement-slice`** → **`07-refactor-prune`** → ADR if needed → **`09-review-traceability`** / `tools/audit.sh` → **CHANGELOG** keyed to `F-*`.

---

## Spine status (snapshot)

| Spine file | Status |
|------------|--------|
| PRODUCT.md | ✅ |
| REQUIREMENTS.md | ✅ (extend as new `R-*` surface appears) |
| ARCHITECTURE.md | ✅ (update when stack or boundaries change) |
| open-questions.md | Interim defaults pinned; close with ADR when product changes |
| ADR 0001 | ✅ two apps + Postgres |
| ADR 0002–0004 | ✅ unfurl SSRF, click enrichment placement, markdown sanitization policy |

**Shipped features**

| F-* | Scope (summary) | PRODUCT_PLAN phase overlap |
|-----|------------------|----------------------------|
| [F-001](./features/F-001-redirect-core.md) | Bun redirect, `click_events` minimal path, slug rules | Phase 1 redirect + logging core |
| [F-002](./features/F-002-portal-links-crud.md) | Astro portal link CRUD, `R-005` validators in core | Phase 1 subset (no unfurl / MD notes UI yet) |

---

## Roadmap: PRODUCT_PLAN phases → planned vibe slices

PRODUCT_PLAN §7 groups work; below is a **suggested** `F-*` breakdown (renumber if you prefer — **never reuse** retired `F-*` ids).

| PRODUCT phase | Intended scope (from §7) | Feature spec | Primary `R-*` |
|---------------|---------------------------|----------------|---------------|
| Phase 0 — Skeleton | Already largely satisfied | — | — |
| Phase 1 *(remaining)* | Fetch from URL, `target_preview` list, markdown notes + modal | [F-003](./features/F-003-portal-unfurl-previews.md) · [F-004](./features/F-004-portal-notes-markdown.md) | R-024–R-026, R-025, R-027–R-028 |
| Phase 2 | UA/bot/geo enrichment + analytics UI + maps | [F-005](./features/F-005-click-enrichment.md) · [F-006](./features/F-006-analytics-dashboards.md) | R-008–R-011 |
| Phase 3 | Bulk paste, export, UTM/tags/QR polish | [F-007](./features/F-007-bulk-import-export.md) · [F-008](./features/F-008-marketer-utm-tags-qr.md) | R-029, R-030, R-035–R-037 |
| Phase 4 | REST + API keys + in-app auth | [F-009](./features/F-009-api-and-auth.md) | R-033, R-034, R-032 |

Anything in [backlog.md](./backlog.md) should be **promoted into REQUIREMENTS + an `F-*`** before `05-test-first`, or stay explicitly out-of-cycle.

---

## Production / operations checklist

Use this when moving from “works on my machine” to **two origins** (`c.*` redirect, `short.*` portal) on real infrastructure.

**Build & data**

- [ ] Single migration source: `packages/db/migrations/`; run **before** or with each deploy of redirect + portal (`bun run db:migrate` with `DATABASE_URL`).
- [ ] **Backup/retention** policy for Postgres (and GeoIP files if used) documented.
- [ ] **`.env` / secrets**: `DATABASE_URL` never in git; separate process env per app if desired.

**Deploy topology**

- [ ] **Redirect** (`apps/redirect`): bind + TLS at edge; `HOST`/`PORT`/`TRUST_PROXY_HOPS` match your reverse proxy (**ARCHITECTURE.md**).
- [ ] **Portal** (`apps/portal`): `astro build` → Node adapter output; run `node dist/server/entry.mjs` (or Bun if validated); **no cookies on redirect hostname**.
- [ ] **Health**: redirect **`/healthz`** for probes; define portal health (e.g. `GET /` or dedicated route) once load balancers need it.

**Security (until Phase 4 auth)**

- [ ] Portal behind **deployment-level gate** (VPN, Tailscale, reverse-proxy basic auth, IP allowlist) per PRODUCT_PLAN §3.2 / ARCHITECTURE.
- [ ] Rate limits / abuse controls at edge (404 storms on redirect, POST flood on portal).
- [ ] When **SSR unfurl** ships (F-003): SSRF controls and outbound allowlists as per PRODUCT_PLAN §6.2.

**Observability**

- [ ] Redirect: structured logs or metrics for 4xx/5xx and latency; avoid logging full PII unless required.
- [ ] Portal: same + migration failures on startup if you check DB eagerly.

**Release discipline**

- [ ] Each mergeable slice closes an **`F-*`** with green tests + **Reality Check** + **`tools/audit.sh F-NNN`** (extend script as traces grow).
- [ ] **CHANGELOG.md** carries user-facing bullets per **`F-*`**.

---

## “Complete” definition

You have a **complete production plan** when:

1. **PRODUCT_PLAN.md** phased intent is tracked in **`F-*`** files with contracts and tests (**vibe invariant** passes per slice).
2. **Above ops checklist** is filled for **your** hostnames and infra.
3. **Open questions** are either **`decided` + ADR** or consciously **`interim`** with review dates.

This file is the **roadmap index**; it does **not** duplicate PRODUCT_PLAN’s full requirements — edit **PRODUCT_PLAN** for product truth, edit **PRODUCTION_PLAN** for vibe slice names + ops completeness.

---

## Document history

| Version | Notes |
|---------|--------|
| 1.0 | Initial bridge: PRODUCT_PLAN ↔ vibe spine ↔ ops checklist; roadmap table for suggested F-003–F-009. |
| 1.1 | Roadmap table links to real `F-003`–`F-009` files; ADR 0002–0004 in spine snapshot. |

# Product

**Deep spec:** [PRODUCT_PLAN.md](./PRODUCT_PLAN.md) (architecture, data model, phased delivery, success criteria).

Single-tenant URL shortener: public redirects on `c.anh.pw`, private management on `short.anh.pw`, for **one operator** (you). Not a SaaS.

---

## Primary user

You: create and organize campaign links, skim where they land without opening every tab, annotate context in markdown, and **measure** traffic with geography and device signal—without selling access to anyone else.

## Anti-persona

- **Teams / multi-tenant customers** — no orgs, seats, or billing.
- **Anonymous “just shorten this” users** — no public signup; redirect host is not a generic paste service.
- **White-label / per-customer domains (v1)** — out of scope until explicitly prioritized.

---

## Pillars (each has a veto test)

### 1. Fast, dumb redirect surface

The redirect app answers only: “valid slug? → emit redirect.” It must not grow admin routes, sessions, or synchronous heavy work (full analytics writes, metadata fetches, markdown).

- **Strengthens:** sub-millisecond-ish app work, small memory, clear security boundary with the portal.
- **Violates:** serving portal pages from the redirect host; blocking `302` on GeoIP resolution, email sends, or OG fetches; embedding business rules that belong in the portal.

### 2. Forensic click signal (personal use)

Store as much **request and enrichment** signal as practical per click (IP, UA, referrer, language, geo where available, parsed device/browser, bot flag, optional bounded raw headers)—so you can answer marketer questions later. The redirect may enqueue or async-write; it must not compromise pillar 1.

- **Strengthens:** richer `click_events`, maps and breakdowns in the portal, optional bot filtering.
- **Violates:** stripping fields to “privacy-default” without an explicit product decision; tying redirect availability to analytics pipeline success (redirect should degrade safely if logging fails).

### 3. Operator clarity at a glance

Portal UX makes **destinations and intent obvious**: unfurl-backed list previews (`target_preview`), truncated note excerpts with safe full markdown in a dialog, bulk import/export when shipped, dashboards themed to [design.md](../design.md) (single accent, flat, readable type).

- **Strengthens:** previews from stored DB fields (no N+1 fetches per list row); Write/Preview for notes; scannable analytics.
- **Violates:** gradient chrome or multiple competing accent colors; unbounded raw HTML from notes without sanitization; list rows that silently omit “where this link goes.”

---

## Hard non-goals (v1)

- Multi-user auth and authorization models (portal may use **deployment-level** protection until in-app auth lands).
- Compliance program for external data subjects; this is a **personal** tool—legal awareness remains your responsibility if exposure changes.
- Custom domains beyond the chosen short hostname unless added as an explicit phase.

---

## Glossary

| Term | Meaning |
|------|---------|
| **Redirect app** | Bun service on `c.anh.pw`; `GET /:slug` → `301`/`302`; async or non-blocking `click_events` insert. |
| **Portal** | Astro + Svelte SSR on `short.anh.pw`; CRUD links, previews, notes, analytics UI, imports/exports per plan. |
| **Slug** | Path segment identifying a short link; unique globally; random or user-chosen. |
| **Destination URL** | Long URL the slug resolves to after validation (no dangerous schemes). |
| **Target preview / unfurl** | Denormalized metadata (`target_preview`) from HTTP fetch: title, description, image, etc.—portal only. |
| **Fetch from URL** | Portal-side (or shared job) GET with SSRF controls; populates `display_title` and `target_preview`. |
| **Notes (markdown)** | `notes_markdown`: operator-authored GFM-ish content; sanitized render in preview/dialog; excerpt in list. |
| **Click event** | Append-only row: when a slug was hit plus request-derived and geo-enriched fields. |
| **Paused link** | Link `status` where redirect does not send traffic to destination (behavior pinned in requirements when built). |

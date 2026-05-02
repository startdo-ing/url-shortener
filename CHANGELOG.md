# Changelog

## Unreleased

- F-001: Postgres-backed Bun redirect (`apps/redirect`); slug resolution, `/healthz`, minimal async `click_events` insert; `@url-shortener/core` slug parsing.
- F-002: Astro SSR portal (`apps/portal`) — link CRUD forms, Postgres mutations, design-token CSS; `@url-shortener/core` destination URL validation + random slug helpers.
- F-003: Portal **POST `/api/link-preview`** (ADR-0002 bounded fetch + SSRF checks); `@url-shortener/core` **`isSsrfBlockedUrl`**, **`extractTargetPreviewFromHtml`**; list cards from **`target_preview`** (HTTPS images only); **UTC `expires_at`** on create/edit.
- F-004: Markdown **Write / Preview** (`markdown-it` + **task lists** + **`sanitize-html`** per ADR-0004); **64KB** notes cap; list **excerpt + View full** modal (`<dialog>`, focus return, Tab trap); packages: **`markdown-it`**, **`markdown-it-task-lists`**, **`sanitize-html`**.
- F-005: Async **`click_events` enrichment** after `INSERT … RETURNING id` (**ADR-0003**): **`ua-parser-js`** + **`isbot`** → `browser` / `os` / `device_type` / `is_bot`; optional **`maxmind`** + **`GEOIP_CITY_DB`** for GeoLite2-City; **`RAW_HEADERS_ENABLED`** + whitelisted **`raw_headers`** (8 KiB cap).
- F-006: Portal **`GET /analytics`** and **`GET /analytics/[slug]`** — UTC **inclusive** date range (default 14d, max 400d), **`human`** bot filter, read-only SQL aggregates: totals, **by day** (CSS bars), **by country** (density grid + `??` + **R-010** `countryRollupToMap` tests), device + browser tables.
- F-007: **`GET /links/bulk`** + **`POST /api/bulk-links`** (preview vs commit); **`parseBulkPaste`** (TAB/comma slug column); **`GET /api/export-links-csv`** / **`export-links-json`** with **`click_count`**; nav **Bulk** on home.
- F-008: Migration **`002_f008_utm_tags`** (`utm_templates`, `tags`, `link_tags`); **`mergeUtmParamsIntoUrl`** in core; portal **`/utm`**, **`/tags`**, link form **UTM template** + **tags**; home **`?q=`** search; **`GET /api/links/[id]/qr.svg`** (`qrcode`); **`PUBLIC_SHORT_BASE_URL`** in `.env.example`.
- F-009: Migration **`003_f009_api_keys_sessions`**; **`/api/v1/links`** (GET/POST) and **`/api/v1/links/:id`** (GET/PATCH/DELETE) with **`Authorization: Bearer`** + SHA-256 stored keys; **`/api-keys`** UI; optional **`AUTH_MODE=session`** + **`/login`** + **`sid`** cookie; middleware + **`Astro.locals.authed`**; shared **`applyUtmTemplateIfPresent`** for form + JSON creates.
- Docs: full **F-003–F-009** feature specs + **ADR 0002–0004**; **R-033–R-037** in REQUIREMENTS; [docs/features/README.md](docs/features/README.md) traceability index; PRODUCTION_PLAN roadmap links updated.

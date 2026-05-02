# F-009 — HTTPS API · API keys · in-app portal auth

- **Status:** done
- **Owner:** Operator (solo)
- **Linked requirements:** R-033, R-034, R-032
- **Linked ADRs:** [ADR 0001](../adr/0001-monorepo-two-apps-postgres.md)
- **Depends on Q:** Deploy-only gate coexistence — **AUTH_MODE=off** keeps current behavior; **AUTH_MODE=session** adds cookie sessions (see `.env.example`).
- **Estimated slices:** 2+ *(first ship: API keys + v1 links + optional session gate)*

## Goal

Versioned **`/api/v1/*`** JSON on the **portal origin** with **`Authorization: Bearer <api_key>`** (**R-033**); keys stored as **SHA-256 hex** only (plus **`key_prefix`** for lookup). Optional **session login** for browser management when **`AUTH_MODE=session`** (**R-034**). Redirect app unchanged (**R-032**).

## Schema

Migration **`packages/db/migrations/003_f009_api_keys_sessions.sql`:**

- **`api_keys`** — `name`, `key_prefix` (12 hex, unique among non-revoked), `key_hash` (64 hex chars), `revoked_at`.
- **`sessions`** — opaque `id` (cookie value), `expires_at` (7-day TTL on create).

## API key format

Plaintext once: **`usk_<12-hex-prefix>.<secret>`** (secret is 24 random bytes, base64url). Verify: lookup active row by `key_prefix`, constant-time compare `SHA256(full_plaintext)` to `key_hash`.

## Public contract — `/api/v1`

All responses **`application/json`**. Missing/invalid key:

**`401`** body exactly: `{ "error": "unauthorized" }`.

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/v1/links` | `{ "links": [ … ] }` each with `tags[]` |
| `POST` | `/api/v1/links` | JSON: `destination_url` (required), `slug?`, `redirect_type` (301\|302), `status`, `display_title?`, `notes_markdown?`, `expires_at?` (ISO), `tags?` (string or string[]), `utm_template_id?`. **201** `{ "link": … }` |
| `GET` | `/api/v1/links/:id` | **404** `{ "error": "not_found" }` |
| `PATCH` | `/api/v1/links/:id` | Full replace fields like portal update; omit **`tags`** to leave tags unchanged. **409** `duplicate_slug` |
| `DELETE` | `/api/v1/links/:id` | **204** empty body |

Other errors: **400** / **409** with `{ "error": "<code>" }` using mutation codes (`invalid_destination`, `invalid_slug`, …).

## Portal auth (R-034)

| Env | Meaning |
|-----|--------|
| `AUTH_MODE=off` *(default)* | No session gate; deploy-level protection only. |
| `AUTH_MODE=session` | Non-`/api/v1/*` HTML + non-exempt `/api/*` require valid **`sid`** cookie; anonymous **`302`** → **`/login`**. |

| `POST` | `/api/login` | form `password` — sets **`sid`** (requires **`PORTAL_AUTH_HASH`** bcrypt). |
| `POST` | `/api/logout` | clears session |

Exempt from session middleware: **`/api/v1/*`**, **`/login`**, **`/api/login`**, **`/api/logout`**, **`/_astro/*`**.

## Management UI

| `GET` | `/api-keys` | List active keys (prefix only), create, revoke |

New key shown once via redirect query `once` (base64url-encoded UTF-8).

## Test List

- [x] **R-033** — `jsonUnauthorized` body stable; crypto helpers unit tests.
- [ ] **R-033** — full HTTP matrix vs live Postgres (manual / CI with DB).
- [x] **R-034** — middleware ordering + login path documented; smoke manually with `AUTH_MODE=session`.

## Implementation Checklist

- [x] Migrations `sessions`, `api_keys`
- [x] Middleware + `Astro.locals.authed`
- [x] Constant-time hash compare for API keys
- [x] Rate-limit keys — document backlog (operator scales via proxy)

## Out of Scope

- OAuth SSO — backlog.
- **GET /api/v1/analytics** aggregates — backlog (portal UI remains source of truth).

## Changelog Entry (draft)

- `F-009: /api/v1/links CRUD + Bearer API keys (hashed) + optional AUTH_MODE=session + /login + /api-keys.`

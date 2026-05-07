# URL Shortener

Production-oriented URL shortener built as two Bun-based apps with one shared SQLite database.

## Architecture

- `apps/redirect-service`: hot-path redirect server for short-link resolution and click capture
- `apps/management-web`: Astro + Svelte dashboard for auth, domains, links, and operations
- `packages/shared-db`: shared Drizzle schema, client, migrations, and backup tooling

The architecture is intentionally split so redirect latency stays isolated from dashboard traffic. See [docs/PRODUCT-PLAN.md](/home/anhpw/startdo.ing/url-shortener/docs/PRODUCT-PLAN.md) and [docs/adr/ADR-001-two-app-architecture.md](/home/anhpw/startdo.ing/url-shortener/docs/adr/ADR-001-two-app-architecture.md) for the product and architecture decisions.

## Feature Overview

### Redirect Service Features

- Short-link resolution by host + slug with `301` / `302` / `307` redirects
- Password-protected short links (HTML password prompt, POST verify, then redirect)
- Link-state enforcement: disabled links return `404`, expired links return `410`
- Request rate limiting (per IP sliding window)
- Click-event capture for analytics (non-blocking async write)
- Prometheus metrics endpoint with optional bearer token protection
- Health endpoint with DB probe

### Management Web Features

- Keycloak OIDC sign-in flow with first-admin bootstrap
- Local RBAC (`admin` / `member`) for dashboard actions
- Domain management: create, verify DNS, enable/disable, set primary, delete
- Link management: create, search/filter, update, delete
- Optional link password support in create/update forms
- Analytics dashboard: top links and recent click events
- Public JSON API for links (`/api/links`, `/api/links/:id`)
- Admin-managed API tokens with rotation, removal, and usage counts
- Health + metrics endpoints for operational monitoring

### Feature Matrix

| Feature | App | Endpoint / Page |
| --- | --- | --- |
| Short-link redirect | `redirect-service` | `GET /<slug>` |
| Password-protected redirect | `redirect-service` | `GET /<slug>`, `POST /<slug>` |
| Expired / disabled link enforcement | `redirect-service` | `GET /<slug>` |
| Click-event capture | `redirect-service` | redirect request path |
| Redirect metrics | `redirect-service` | `GET /metrics` |
| Redirect health probe | `redirect-service` | `GET /health` |
| OIDC sign-in | `management-web` | `GET /auth` |
| First-admin bootstrap | `management-web` | `/setup/first-admin` |
| Dashboard home | `management-web` | `GET /dashboard` |
| Domain management | `management-web` | `/domains` |
| Link management UI | `management-web` | `/links` |
| Analytics dashboard | `management-web` | `GET /analytics` |
| API token management | `management-web` | `GET /users` |
| Public links API | `management-web` | `/api/links`, `/api/links/:id` |
| Management metrics | `management-web` | `GET /metrics` |
| Management health probe | `management-web` | `GET /health` |

## Requirements

- Bun `1.3+`
- A writable SQLite database path shared by both apps
- Keycloak for dashboard authentication

## Local Setup

1. Install dependencies:

```sh
bun install
```

2. Run migrations:

```sh
bun run db:migrate
```

3. Set environment variables.

`apps/management-web`:

```env
APP_URL=http://localhost:3000
DATABASE_PATH=../../dev.sqlite
KEYCLOAK_URL=https://auth.startdo.ing
KEYCLOAK_REALM=startdoing
KEYCLOAK_CLIENT_ID=url-shortener-management-web
KEYCLOAK_CLIENT_SECRET=replace-with-client-secret
METRICS_BEARER_TOKEN=replace-with-an-internal-scrape-token
SESSION_SECRET=replace-with-a-random-string-at-least-32-characters-long
```

`apps/redirect-service`:

```env
DATABASE_PATH=../../dev.sqlite
PORT=8000
METRICS_BEARER_TOKEN=replace-with-an-internal-scrape-token
CLICK_EVENT_RETENTION_DAYS=90
```

4. Start both apps:

```sh
bun run dev
```

Endpoints:

- Management UI: `http://localhost:3000`
- Redirect service: `http://localhost:8000`

## Useful Commands

```sh
bun run dev
bun run test
bun run lint
bun run typecheck
bun run check-all
bun run db:backup
```

## Runtime Endpoints

### Human UI

#### management-web

- `GET /auth`: Open the Keycloak sign-in flow.
- `GET /dashboard`: Open the authenticated dashboard.
- `GET /links`: Open the link management UI.
- `GET /domains`: Open the domain management UI.
- `GET /users`: Open the user management UI (admin only).
- `POST /users`: Manage users and API tokens (admin only).
- `GET /analytics`: Open the analytics dashboard.
- `GET /setup/first-admin`: Open the first-admin bootstrap flow.

#### redirect-service

- `GET /<slug>`: Resolve a short link or render the password prompt.
- `POST /<slug>`: Submit the password for a protected link.

### Machine API

#### management-web

- `GET /api/links`: List links. Auth via session cookie or an admin-managed bearer token.
- `POST /api/links`: Create a link.
- `GET /api/links/:id`: Get one link.
- `PATCH /api/links/:id`: Update a link.
- `DELETE /api/links/:id`: Delete a link.

### Ops Endpoints

#### redirect-service

- `GET /health`: Run a database-backed health probe.
- `GET /metrics`: Return Prometheus metrics. Disabled unless `METRICS_BEARER_TOKEN` is set, then requires `Authorization: Bearer <token>`.

#### management-web

- `GET /health`: Run a database-backed health probe.
- `GET /metrics`: Return Prometheus metrics. Disabled unless `METRICS_BEARER_TOKEN` is set, then requires `Authorization: Bearer <token>`.

### Public API Quickstart

Use the management API with either a signed-in session cookie or a token created by an admin on `/users`.

```sh
export API_TOKEN="paste-a-token-created-in-the-users-page"

curl -s -H "Authorization: Bearer $API_TOKEN" \
	http://localhost:3000/api/links
```

Create a link:

```sh
curl -s -X POST http://localhost:3000/api/links \
	-H "Authorization: Bearer $API_TOKEN" \
	-H "Content-Type: application/json" \
	-d '{
		"domainId": "<domain-id>",
		"slug": "docs",
		"targetUrl": "https://example.com/docs",
		"httpCode": 302,
		"status": "active",
		"password": "optional-password"
	}'
```

Bearer-token requests run as the admin user who created the token. Token usage count and last-used time are updated on successful API authentication.

## Testing

- Redirect-service behavior is covered with focused request-handler tests.
- Management repositories use SQLite-backed integration tests.
- Run app-local tests when working on a specific surface:

```sh
cd apps/redirect-service && bun test
cd apps/management-web && bun test
```

## Operational Notes

- Both apps must point at the same `DATABASE_PATH`.
- SQLite WAL mode is enabled by the shared DB client for concurrent reads and writes.
- Redirect targets are limited to absolute `http` and `https` URLs and reject embedded credentials.

## Further Docs

- [docs/guides/KEYCLOAK-SETUP.md](/home/anhpw/startdo.ing/url-shortener/docs/guides/KEYCLOAK-SETUP.md)
- [docs/guides/RUNBOOK.md](/home/anhpw/startdo.ing/url-shortener/docs/guides/RUNBOOK.md)
- [docs/REDIRECT-REQUEST-LIFECYCLE.md](/home/anhpw/startdo.ing/url-shortener/docs/REDIRECT-REQUEST-LIFECYCLE.md)
- [docs/DB-SCHEMA-INIT.md](/home/anhpw/startdo.ing/url-shortener/docs/DB-SCHEMA-INIT.md)

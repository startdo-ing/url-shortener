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
- API auth via session cookie or bearer token (`MANAGEMENT_API_TOKEN`)
- Health + metrics endpoints for operational monitoring

## Requirements

- Bun `1.3+`
- A writable SQLite database path shared by both apps
- Keycloak for dashboard authentication

## Local Setup

1. Install workspace dependencies:

```sh
bun install
```

2. Run database migrations:

```sh
bun run db:migrate
```

3. Configure `apps/management-web` environment variables:

```env
APP_URL=http://localhost:3000
DATABASE_PATH=../../dev.sqlite
KEYCLOAK_URL=https://auth.startdo.ing
KEYCLOAK_REALM=startdoing
KEYCLOAK_CLIENT_ID=url-shortener-management-web
KEYCLOAK_CLIENT_SECRET=replace-with-client-secret
METRICS_BEARER_TOKEN=replace-with-an-internal-scrape-token
MANAGEMENT_API_TOKEN=replace-with-a-random-api-token
SESSION_SECRET=replace-with-a-random-string-at-least-32-characters-long
```

4. Configure `apps/redirect-service` environment variables:

```env
DATABASE_PATH=../../dev.sqlite
PORT=8000
METRICS_BEARER_TOKEN=replace-with-an-internal-scrape-token
CLICK_EVENT_RETENTION_DAYS=90
```

5. Start both apps:

```sh
bun run dev
```

Management UI: `http://localhost:3000`

Redirect service: `http://localhost:8000`

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

### redirect-service

- `GET /<slug>`: resolve and redirect short links (or render password form for protected links)
- `POST /<slug>`: submit password for protected links
- `GET /health`: database-backed health probe
- `GET /metrics`: Prometheus metrics, disabled unless `METRICS_BEARER_TOKEN` is set, then requires `Authorization: Bearer <token>`

### management-web

- `GET /auth`: Keycloak sign-in entrypoint
- `GET /dashboard`: authenticated dashboard landing page
- `GET /analytics`: click-event dashboard
- `GET /health`: database-backed health probe
- `GET /metrics`: Prometheus metrics, disabled unless `METRICS_BEARER_TOKEN` is set, then requires `Authorization: Bearer <token>`
- `GET /api/links`: list links (session auth or `Authorization: Bearer <MANAGEMENT_API_TOKEN>`)
- `POST /api/links`: create link
- `GET /api/links/:id`: get one link
- `PATCH /api/links/:id`: update link
- `DELETE /api/links/:id`: delete link

### Public API Quickstart

Use the management API with either a signed-in session cookie (browser) or an API token.

```sh
export API_TOKEN="replace-with-management-api-token"

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

When `MANAGEMENT_API_TOKEN` is configured, requests authenticated by this token execute as the first active admin user in the local user table.

## Testing

- Redirect-service behavior is covered with focused request-handler tests.
- Management link/domain/user repositories use SQLite-backed integration tests.
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

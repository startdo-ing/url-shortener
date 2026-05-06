# Management Web Astro Parity Checklist

This checklist is the migration gate for replacing `apps/management-web`.
Do not cut over until every implemented Remix feature is mirrored in `apps/management-web-astro`.

## Route Contract

- [x] `GET /`
- [x] `GET /auth`
- [x] `GET /auth/login`
- [x] `GET /auth/callback`
- [x] `POST /auth/logout`
- [x] `GET /setup/first-admin`
- [x] `POST /setup/first-admin`
- [x] `GET /dashboard`
- [x] `GET /domains`
- [x] `POST /domains`
- [x] `GET /links`
- [x] `POST /links`
- [x] `GET /users`
- [x] `POST /users`
- [x] `GET /metrics`

## Authentication and Session Parity

- [x] Session cookie name and security options mirror Remix app.
- [x] OIDC login start behavior mirrors `/auth/login`.
- [x] OIDC callback behavior mirrors `/auth/callback` for success and failure states.
- [x] First-user bootstrap path is triggered exactly when local user count is zero.
- [x] Session keys mirror Remix behavior (`auth`, `keycloak`, `pendingBootstrap`, flash keys).
- [x] Logout performs local session destruction and Keycloak logout redirect.

## RBAC and Access Control

- [x] `requireSignedInViewer` equivalent for protected pages.
- [x] `users:manage` permission enforcement for `/users`.
- [x] Permission map mirrors admin/member contract exactly.
- [x] Unauthorized behavior mirrors redirects and flash message behavior.

## Feature Behavior Parity

- [ ] Dashboard page behavior mirrors Remix implementation.
- [x] Domain create/verify/enable/disable/delete/set-primary flows mirror Remix.
- [x] Domain validation and duplicate-host handling mirror Remix.
- [x] Link create/update/delete flows mirror Remix.
- [x] Link filters (`query`, `domainId`, `status`) mirror Remix.
- [x] Link validation and duplicate slug handling mirror Remix.
- [x] User promote/demote/enable/disable flows mirror Remix.
- [x] Last-active-admin and self-modification guards mirror Remix.

## Operational Parity

- [x] Request logging fields mirror Remix app (`method`, `path`, `status`, `durationMs`).
- [x] Error logging on unhandled exceptions mirrors Remix app.
- [x] Prometheus metric naming and labels mirror Remix app.

## Validation and Cutover Gate

- [ ] Equivalent behavior tests exist for all implemented Remix features.
- [x] Root scripts run redirect-service + Astro app by default.
- [x] Docker Compose runs Astro service by default; Remix is non-default.
- [ ] Final parity review confirms no implemented Remix feature is missing.

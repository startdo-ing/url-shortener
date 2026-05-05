# ADR-006: Keycloak for Authentication and Authorization

## Status
Accepted

## Context
The management-web app needs secure user authentication and authorization. Building custom auth in-house is high risk and high maintenance. The project already operates within an ecosystem that includes a self-hosted Keycloak instance.

Self-hosted Keycloak: https://auth.startdo.ing

## Decision
Use Keycloak as the identity provider for management-web via OIDC (OpenID Connect).

Scope:
- management-web authenticates users through Keycloak OIDC flow.
- Keycloak manages the upstream identity session and OIDC tokens.
- redirect-service does not require authentication (public hot path).

Integration approach:
- Use OIDC authorization code flow (server-side, Remix loaders).
- Store the authenticated local viewer in a secure server-side session after a successful callback.
- Keep the local `users` table as the authorization source of truth for `admin` and `member`.
- Reserve Keycloak role names `url-shortener-admin` and `url-shortener-member` for future claim-to-role mapping, but do not auto-sync them into existing local users in the current milestone.
- Validate protected requests against the local session plus the local user's active state.

Keycloak instance:
- URL: https://auth.startdo.ing
- Used in all environments including local development.
- No local Keycloak instance or OIDC mock required.

Keycloak realm and client:
- Realm: to be defined (e.g. startdo or url-shortener).
- Client: management-web with confidential client type.
- Redirect URIs: must include both production domain and localhost for dev.

## Consequences
Positive:
- No custom password management or session security implementation needed.
- SSO across the ecosystem for free.
- Identity stays centralized while app authorization remains explicit and auditable in the local database.
- OIDC is a stable, auditable standard.

Negative:
- Keycloak availability is now a dependency of the dashboard.
- Local dev requires either a local Keycloak instance or mock OIDC provider.
- Any future Keycloak role sync must avoid silently overriding local admin/user-management decisions.

## Alternatives Considered
1. Custom auth with password + session
- Rejected as high-risk and high maintenance.

2. Local dev OIDC mock or Docker Keycloak
- Rejected. Real https://auth.startdo.ing is used in all environments.

## Follow-up
- Define Keycloak realm and client configuration.
- Document local dev setup: add localhost redirect URI to Keycloak client, use `.env` for client secret.
- Define role model and permission mapping in dashboard.
- Add token refresh and session invalidation handling to implementation spec.

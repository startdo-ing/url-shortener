# ADR-010: Single-Tenant Multi-User with Keycloak and RBAC

## Status
Accepted

## Context
The app is personal and single-tenant, but additional collaborators may be needed for operations. Authentication is already delegated to Keycloak OIDC.

## Decision
Adopt a single-tenant multi-user model:
- Authentication: Keycloak OIDC only.
- No local password login.
- Local users table stores identity mapping and authorization.
- Roles: admin and member.

Authorization model:
- admin: manage users, roles, and all dashboard operations.
- member: manage links/domains and view analytics, but cannot manage users.

First account initialization:
- If no local users exist, first successful SSO login can complete setup onboarding and is assigned admin.
- After first admin is created, onboarding route is disabled for normal access.
- Mechanism: onboarding route loader performs `SELECT COUNT(*) FROM users` at request time. If count > 0, redirect to dashboard home. This check is the only guard — no separate feature flag or config needed.

## Consequences
Positive:
- Keeps architecture simple (no multi-tenant complexity).
- Supports team collaboration safely.
- Uses centralized SSO while keeping app-specific authorization local.

Negative:
- Requires careful protection of first-admin bootstrap route.
- Requires admin UX for user lifecycle management.

## Alternatives Considered
1. Single-user only forever
- Rejected to allow trusted helpers.

2. Full multi-tenant model now
- Rejected as unnecessary complexity.

## Follow-up
- Add users table fields: keycloak_sub, role, is_active.
- Implement first-admin setup onboarding flow.
- Implement admin-only user management page.
- Add tests for role-based route protection.

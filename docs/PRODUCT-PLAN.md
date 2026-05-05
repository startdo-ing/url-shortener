# URL Shortener Product Plan

## 1. Product Intent

Build a production-grade URL shortener with strict planning discipline and documentation-first execution.

Core principle:
- Every feature and architecture decision must be documented before implementation starts.
- The project is intentionally built in small phases with quality gates.
- Rewrites are expected possibilities, not emergencies.

## 2. Architecture Decision (Locked)

We will run two apps with one shared database:

1. Dashboard app (management UI)
- Framework: Remix Version 3 Preview
- Role: SSR dashboard for link and system management
- Host example: short.anh.pw
- Auth: Keycloak OIDC (self-hosted at https://auth.startdo.ing)

2. Redirect app (hot path)
- Runtime: raw Bun.js
- Role: fast redirect handling for c.anh.pw/*
- Host example: c.anh.pw

3. Shared database
- Both apps read/write the same relational database
- Schema is contract-driven and migration-managed

Rationale:
- Redirect performance is isolated from admin workload.
- SSR dashboard can evolve independently.
- Separate deploy cadence for traffic-critical vs management features.

## 3. Frontend Framework Policy

Remix Version 3 Preview is treated as production-ready for this project.

Policy:
- No rollback strategy is required.
- If Remix 3 Preview blocks progress, we rewrite only the frontend app using another framework (for example TanStack Start).
- Redirect app and database remain stable during frontend rewrite.

Rewrite trigger definition:
- A blocker persists for more than 2 consecutive milestones.
- The blocker prevents delivery of core dashboard workflows.
- The blocker has no practical workaround within acceptable complexity.

Rewrite guardrails:
- Keep domain logic and validation outside UI framework-specific code.
- Keep dashboard API contract stable so FE can be replaced.
- Keep route-level acceptance tests framework-agnostic where possible.

## 4. Engineering Principles

1. Plan before code
- Every implementation ticket must reference a spec section and acceptance criteria.

2. Small increments
- Scope each milestone to 1-2 weeks with measurable outcomes.

3. Test where risk is highest
- Redirect correctness and latency are highest priority.

4. Operational readiness as a feature
- Metrics, logs, and runbooks are mandatory before broad rollout.

5. Documentation is part of done
- A feature is not complete if docs are missing or outdated.

## 5. Domain Model (Initial)

Primary entities (v1):
- User
- Domain
- ShortLink
- ClickEvent
- AuditLog

Deferred to future phase (not in schema v1, not in Milestone 1-2 scope):
- ApiKey (programmatic API access for creating/managing links)
- RedirectRule (advanced routing rules, e.g. wildcard or A/B redirects)

ShortLink minimum fields:
- id (uuid)
- domain_id
- slug (unique per domain)
- target_url
- password_hash (nullable, for password-protected links)
- status (active, disabled)
- http_code (301, 302, 307)
- expires_at (nullable)
- created_by
- created_at
- updated_at

Constraints:
- Unique index: (domain_id, slug)
- Target URL validation required
- Soft-delete optional, but audit trail required

Identity and access model (single-tenant, multi-user):
- Authentication is handled by Keycloak OIDC only.
- No local username/password login.
- Local users table stores identity mapping and authorization fields.
- Roles: admin and member.
- First account bootstrap: when no local users exist, the first successful SSO user can complete setup via dashboard onboarding and is assigned admin role.
- User management is done in management-web by admins (promote/demote member, disable user access).

Permission mapping:
- `dashboard:view`: admin and member
- `links:manage`: admin and member
- `domains:manage`: admin and member
- `analytics:view`: admin and member
- `users:manage`: admin only

Reserved external role names for future Keycloak mapping:
- `url-shortener-admin` -> local `admin`
- `url-shortener-member` -> local `member`
- Until a later sync milestone is explicitly implemented, the local `users` table remains the authorization source of truth.

## 6. System Boundaries

Dashboard app responsibilities:
- Authentication and authorization via Keycloak OIDC
- Link management CRUD
- Domain management
- Analytics views
- Admin tooling and audit visibility

Redirect app responsibilities:
- Slug lookup by host + path
- Rule evaluation (status, expiry, disabled state)
- Final redirect response
- Lightweight click logging/event enqueue

Out of scope for redirect app:
- User auth sessions
- Heavy analytics processing
- Non-essential joins/aggregations

## 7. Quality Gates (Definition of Done)

A milestone is done only when all are true:

1. Spec done
- Scope, assumptions, acceptance criteria documented.

2. ADR reviewed
- New or changed decisions recorded in ADR format.

3. Tests done
- Unit and integration coverage for modified behavior.
- E2E for user-facing critical path.

4. Observability done
- Logs and core metrics added for new flows.

5. Ops notes done
- Migration notes, runbook updates, and known limits documented.

6. Security check done
- Input validation and rate-limit impact reviewed.

## 8. Milestone Plan

### Milestone 0: Foundation Docs and Contracts

Goal:
- Finalize architecture docs, ADR process, schema conventions, and coding standards.

Deliverables:
- Product plan completed
- ADR template approved
- Data model v1 draft
- API contract draft between dashboard and redirect domain logic

Exit criteria:
- Team can start implementation without ambiguous architecture questions.

### Milestone 1: Database and Core Redirect MVP

Goal:
- Deliver minimal production-capable redirect path.

Deliverables:
- Migration system and schema v1
- Redirect lookup by host + slug
- Expiry/disabled checks
- Correct HTTP redirect behavior

Exit criteria:
- Redirect correctness test suite passes.
- Latency target met in local load test: p99 < 50ms for a warm SQLite lookup on a single host machine.

### Milestone 2: Dashboard MVP (Remix 3 Preview)

Goal:
- Deliver essential management workflows.

Deliverables:
- Keycloak SSO auth
- First-admin setup onboarding page
- User management page (admin only)
- Role-based access control (admin/member)
- Create/edit/delete short links
- Link list with search/filter
- Domain CRUD (create, list, disable)

Domain management acceptance criteria:
- Admin can add a new domain (validated as a legal hostname, duplicate rejected with user-visible error).
- Admin can disable a domain (domain is_active = false; redirect app returns 404 for all its links).
- Deleting a domain with existing short links is blocked at the API level with a descriptive error.
- Domain list visible to admin and member roles.

Exit criteria:
- Critical dashboard flows pass E2E tests.
- Domain CRUD acceptance criteria above are covered by integration or E2E tests.

### Milestone 3: Observability and Reliability

Goal:
- Make system operable under real traffic.

Deliverables:
- Structured logging
- Request metrics and error tracking
- Rate limiting and abuse controls
- Backup and restore procedure

Exit criteria:
- Incident response runbook tested at least once.

### Milestone 4: Feature Expansion

Goal:
- Add growth and product quality features.

Candidate features:
- Tags
- Bulk link actions
- API keys
- Advanced analytics
- UTM presets

Exit criteria:
- Each feature includes specs and tests, no quality gate exceptions.

## 8.1 Milestone Checklist

Use this checklist to track completion before moving to the next milestone.

Milestone 0 checklist:
- [x] Product plan approved
- [x] ADR template approved
- [x] ADR-001 to ADR-003 created
- [x] Schema v1 draft created
- [x] Redirect lifecycle draft created

Milestone 1 checklist:
- [x] Migration tooling initialized
- [x] Initial schema migration created
- [x] Redirect endpoint vertical slice implemented
- [x] Redirect correctness tests passing
- [ ] Baseline latency report documented

Milestone 2 checklist:
- [ ] Keycloak realm and client configured
- [x] OIDC auth flow integrated in management-web
- [x] First-admin onboarding flow implemented
- [x] Role model and permission mapping defined
- [x] Admin user-management page implemented
- [x] Admin/member route protection implemented
- [x] Local dev OIDC setup documented
- [x] Link CRUD implemented
- [x] Link list/search implemented
- [x] Domain assignment implemented
- [ ] Critical dashboard E2E tests passing

Milestone 3 checklist:
- [x] Structured logs available for both apps
- [x] Request metrics and alert thresholds defined
- [x] Rate limiting and abuse controls active
- [ ] Backup and restore tested
- [ ] Incident runbook trial completed

Milestone 4 checklist:
- [ ] Feature specs approved for selected expansion features
- [ ] Delivery of selected features completed
- [ ] Test coverage and operations notes updated
- [ ] No quality gate exceptions outstanding

## 8.2 Definition of Done by Milestone

Milestone 0:
- Spec done: Architecture and scope docs approved.
- ADR reviewed: ADR-001 to ADR-003 accepted.
- Tests done: Not required for documentation-only milestone.
- Observability done: Not required for documentation-only milestone.
- Ops notes done: Milestone plan and workflow documented.
- Security check done: Threat notes captured for upcoming milestones.

Milestone 1:
- Spec done: Redirect MVP behavior and schema changes documented.
- ADR reviewed: ADR-004 and ADR-005 accepted.
- Tests done: Redirect correctness integration tests passing.
- Observability done: Redirect request logs and basic metrics available.
- Ops notes done: Migration and rollback execution steps documented.
- Security check done: Input validation and rate-limit baseline reviewed.

Milestone 2:
- Spec done: Dashboard MVP flows documented.
- ADR reviewed: ADR-006 accepted, any other dashboard architecture changes recorded.
- Tests done: Core dashboard E2E tests passing.
- Observability done: Dashboard error and latency metrics visible.
- Ops notes done: Keycloak client config, token refresh, first-admin bootstrap flow, and session ops documented.
- Security check done: OIDC flow, token validation, role enforcement, and admin-only user-management actions reviewed.

Milestone 3:
- Spec done: Reliability scope and controls documented.
- ADR reviewed: Reliability-related tradeoffs documented.
- Tests done: Reliability and failure-mode tests executed.
- Observability done: Alerting and dashboards actively monitored.
- Ops notes done: Incident runbook and recovery checks validated.
- Security check done: Abuse and protection controls reviewed.

Milestone 4:
- Spec done: Each expansion feature has approved spec.
- ADR reviewed: New architecture decisions documented where needed.
- Tests done: Feature tests and regressions passing.
- Observability done: Metrics/logging updated for new features.
- Ops notes done: Operational impact documented.
- Security check done: Security review complete for each feature.

## 9. Performance Targets (Initial SLO Draft)

Redirect app:
- p95 redirect response time: <= 25ms (excluding network)
- error rate: < 0.1% (5m window)

Dashboard app:
- p95 SSR response time (authenticated pages): <= 400ms

Availability target:
- 99.9% monthly for redirect endpoint

## 10. Documentation Workflow

Required docs per feature:
- Feature spec (problem, scope, non-goals, acceptance)
- ADR impact (new/update/no-change)
- Test plan (unit/integration/e2e/load as needed)
- Ops notes (monitoring, failure modes, remediation)

Pull request checklist:
- Linked spec section
- Linked ADR (if needed)
- Migration notes (if schema changed)
- Test evidence

## 11. ADR Template

Use this template for every architectural decision:

```md
# ADR-XXX: <Title>

## Status
Proposed | Accepted | Superseded

## Context
What problem are we solving and what constraints exist?

## Decision
What are we choosing?

## Consequences
Positive and negative outcomes.

## Alternatives Considered
Option A, Option B, and why not selected.

## Follow-up
What must happen next because of this decision?
```

## 12. First ADR Backlog

Create these ADRs first:

1. Two-app architecture with shared database
2. Remix 3 Preview as production frontend framework
3. Frontend rewrite strategy (TanStack Start as candidate)
4. Redirect data access and caching strategy
5. Click event capture model (inline vs async pipeline)

## 13. Execution Status (May 5, 2026)

Completed:
1. ADR-001 to ADR-005 created.
2. Schema v1 draft created.
3. Redirect request lifecycle document created.
4. Milestone checklist and per-milestone DoD mapping added.
5. ADR-006 created (Keycloak authentication).
6. Milestone 2 checklist updated to reflect Keycloak OIDC integration.
7. ADR-010 created (single-tenant multi-user RBAC and first-admin bootstrap).
8. Milestone 2 fully implemented: Link CRUD, domain CRUD with DNS verification, domain assignment, design token system, route protection.
9. Milestone 3 in progress: structured JSON logging, Prometheus metrics endpoint, IP rate limiting with tests, SQLite backup script, incident runbook, ADR-011 created.

Current next actions:
1. Trial the incident runbook against a local dev instance and mark it complete.
2. Perform a manual backup + restore drill and mark it complete.
3. Begin Milestone 4 feature spec review.


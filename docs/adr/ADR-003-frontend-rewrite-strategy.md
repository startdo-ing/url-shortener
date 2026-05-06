# ADR-003: Frontend Rewrite Strategy if Remix Becomes Blocking

## Status
Superseded by execution decision

## Context
The project accepts Remix 3 Preview in production. If framework limitations block delivery, the frontend may need replacement without disrupting redirect traffic.

## Decision
Remix 3 Preview blocked progress. The frontend rewrite is now active with Astro + Svelte.

Execution decision:
- Keep `apps/management-web` as deprecated trial code.
- Build `apps/management-web-astro` as a full feature mirror of implemented Remix behavior.
- Keep redirect service and database architecture unchanged.

Scope of rewrite:
- Management app frontend and server-side management app behavior only.
- Redirect app and database remain unchanged.

Rewrite trigger:
- A blocker persists for more than two consecutive milestones.
- The blocker prevents core dashboard flow delivery.
- No practical workaround exists with acceptable complexity.

## Consequences
Positive:
- Explicit strategy avoids panic decisions.
- Preserves core performance path and shared data model.

Negative:
- Requires strong boundary discipline from day one.
- Adds planning overhead to keep contracts portable.

## Alternatives Considered
1. Full system rewrite when blocked
- Rejected as high-cost and unnecessary.

2. Keep patching Remix indefinitely
- Rejected if it repeatedly blocks milestone delivery.

## Follow-up
- Maintain a parity checklist that maps every implemented Remix feature to Astro implementation status.
- Block cutover until parity checklist passes without missing implemented features.
- Keep Remix app runnable directly for rollback during migration, but out of default root and compose runtime paths.

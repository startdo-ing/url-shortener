# ADR-003: Frontend Rewrite Strategy if Remix Becomes Blocking

## Status
Accepted

## Context
The project accepts Remix 3 Preview in production. If framework limitations block delivery, the frontend may need replacement without disrupting redirect traffic.

## Decision
If Remix 3 Preview blocks progress, rewrite only the frontend app using another framework (TanStack Start is the first candidate).

Scope of rewrite:
- Dashboard UI and frontend framework layer only.
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
- Define framework-agnostic dashboard API contracts.
- Build acceptance tests around behavior, not framework internals.
- Track blocker incidents in milestone reviews.

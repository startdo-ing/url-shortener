# ADR-002: Remix Version 3 Preview as Production Frontend

## Status
Accepted

## Context
The dashboard application requires SSR capabilities and a modern route/data model.
The product direction explicitly prefers using Remix Version 3 Preview in production now.

## Decision
Use Remix Version 3 Preview as the production framework for the dashboard app.

Operational stance:
- Remix 3 Preview is treated as production-ready for this project.
- No rollback plan is required as part of this decision.

## Consequences
Positive:
- Immediate alignment with current framework preference.
- Faster forward progress without version hedging.

Negative:
- Preview framework risk is accepted by policy.
- Potential framework instability may require frontend rewrite.

## Alternatives Considered
1. Use stable Remix release
- Rejected by project policy.

2. Use TanStack Start immediately
- Rejected because the current choice is Remix 3 Preview first.

## Follow-up
- Keep domain and validation logic decoupled from framework-specific code.
- Keep backend contracts stable to reduce future rewrite cost.

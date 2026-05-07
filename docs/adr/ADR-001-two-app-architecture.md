# ADR-001: Two-App Architecture With Shared Database

## Status
Accepted

## Context
The product has two distinct traffic profiles:
- Redirect traffic is latency-sensitive and must stay minimal.
- Management traffic involves authenticated SSR pages and heavier operations.

A single app would mix these concerns, increasing risk on the redirect hot path.

## Decision
Adopt two deployable applications:
- Dashboard app on Astro + Svelte for management workflows.
- Redirect app on raw Bun.js for high-performance redirects.

Both apps share one relational database and a common schema contract.

## Consequences
Positive:
- Better performance isolation for redirect requests.
- Independent scaling and deployment cadence.
- Clear separation of concerns.

Negative:
- Higher operational complexity.
- Requires strict schema governance and migration discipline.

## Alternatives Considered
1. Monolithic app for all concerns
- Rejected due to hot-path performance and coupling risks.

2. Fully separate databases per app
- Rejected for now due to data consistency overhead and duplicate models.

## Follow-up
- Define schema ownership and migration workflow.
- Define service boundaries and allowed cross-app dependencies.

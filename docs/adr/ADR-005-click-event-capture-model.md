# ADR-005: Click Event Capture Model (Async First)

## Status
Accepted

## Context
Click analytics are useful but must not degrade redirect performance. Synchronous event writes on every request can increase tail latency and failure coupling.

## Decision
Adopt async-first click event capture:
- Redirect response is decided and returned first.
- Click event is emitted asynchronously to a queue or buffered writer.
- Event write failures must not fail or delay redirect response.

Minimum event payload:
- short_link_id
- request_host
- request_path
- referer
- user_agent
- ip_hash (if available)
- occurred_at

## Consequences
Positive:
- Redirect latency remains stable.
- Analytics pipeline can scale independently.

Negative:
- Event delivery can be delayed or dropped under failure.
- Requires idempotency and monitoring for ingestion quality.

## Alternatives Considered
1. Fully synchronous DB insert on redirect path
- Rejected due to latency and coupling impact.

2. No event capture in redirect service
- Rejected because analytics is a core product capability.

## Follow-up
- Delivery guarantee: **decided as best-effort**. The redirect service uses fire-and-forget (`emitClickEvent(...).catch(() => {})`). Event loss under failure is acceptable. No retry or dead-letter queue required for v1.
- Add analytics lag and drop-rate metrics (future observability milestone).

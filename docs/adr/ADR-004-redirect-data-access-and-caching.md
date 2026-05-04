# ADR-004: Redirect Data Access and Caching Strategy

## Status
Accepted

## Context
The redirect service is latency-sensitive and must minimize synchronous work per request. Database reads must be predictable and cache usage must not compromise correctness for disabled/expired links.

## Decision
Use a read-optimized lookup strategy:
- Primary lookup key: host + slug.
- Query path:
  1. Resolve active domain by host.
  2. Resolve short link by (domain_id, slug).
  3. Evaluate status and expires_at.

Caching policy:
- Optional in-memory cache for positive lookups with short TTL.
- Cache key: host:slug.
- Invalidate on link update/disable/enable/delete operations.
- Do not cache negative results for longer than a minimal TTL.

## Consequences
Positive:
- Predictable low-latency redirect behavior.
- Reduced database read pressure for hot links.

Negative:
- Cache invalidation complexity.
- Temporary stale reads are possible within TTL window.

## Alternatives Considered
1. No cache at all
- Rejected for potential DB pressure under burst traffic.

2. Aggressive long-lived cache
- Rejected due to correctness risk for disabled/expired links.

## Follow-up
- Implement cache abstraction behind interface.
- Add cache hit/miss and stale-read monitoring metrics.
- Add tests for invalidation behavior on link state changes.

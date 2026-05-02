# ADR 0002 — Unfurl outbound fetch boundaries (portal)

## Status

Accepted

## Context

[PRODUCT_PLAN.md](../PRODUCT_PLAN.md) §6.2 and **R-024** require a portal-side HTTP fetch to derive `display_title` and `target_preview` without SSRF abuse or unreliable hangs.

## Decision

Implement unfurl **`fetch` only in `apps/portal`** (never in `apps/redirect`). For every attempt:

1. **Timeout:** hard cap **5s** wall time for the full redirect chain.
2. **Redirect hops:** at most **5** HTTP redirects; abort if exceeded.
3. **Response body size:** read at most **512 KiB** of body after successful connect; discard remainder.
4. **SSRF blocklist (destination host after DNS resolution is not required pre-connect in v1 — block by URL parse + IP literal):**
   - Reject if resolved URL host is **literal** `localhost`, `127.0.0.0/8`, `::1`, `0.0.0.0`, `169.254.0.0/16` link-local literals, **`10.0.0.0/8`**, **`172.16.0.0/12`**, **`192.168.0.0/16`**, **`fc00::/7` ULA** where parseable from URL host string.
   - Reject hostname **patterns** `.local` suffix (optional) — may false-positive; start without unless abuse seen.
5. **Fetch URL** starts at the link’s stored **normalized destination URL** only (`http:` or `https:` per **R-005**); redirects during fetch may not target a hop whose host matches the blocklist above (as far as URL parsing allows without DNS pre-check in v1).
6. Store only **sanitized scalars** in `target_preview` JSON: truncate `title` 500 chars, `description` 1000 chars, `imageUrl` must be **`http:` or `https:`** absolute URL ≤ 2048 chars or omitted; **`siteName`** ≤ 120 chars.

## Alternatives considered

1. **Shared unfurl worker / queue** — better isolation; defer until throughput demands.
2. **DNS resolution gate** blocking private IPs — stronger; adds dependency and latency; adopt in F-003 if URL-parse blocks prove insufficient (document follow-up).

## Consequences

- Tests use **in-process HTML fixtures** or **mock `fetch`** — no live network in unit/contract tests (AGENT determinism).
- Redirect service remains free of outbound HTTP for unfurl.

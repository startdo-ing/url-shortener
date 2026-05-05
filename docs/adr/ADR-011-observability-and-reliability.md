# ADR-011: Observability and Reliability Strategy

## Status
Accepted

## Context
Milestone 3 requires the system to be operable under real traffic. Both apps run as
single-process Bun servers with a shared SQLite database. The observability budget
must be zero external runtime dependencies (no Kafka, no external log aggregator, no
Redis) to stay consistent with the single-host deployment model defined in ADR-009.

## Decision

### Structured logging
Both apps write JSON log lines to stdout (`timestamp`, `level`, `service`, `msg`,
plus per-request context fields). A thin `logger.ts` module in each app formats the
output as JSON in production (`NODE_ENV=production`) and human-readable in development.
No log library is required.

### Request metrics
Both apps expose a `GET /metrics` endpoint that returns Prometheus text format.
Counters are kept in-process using a `Map`. The endpoint is unauthenticated so that
Prometheus or a compatible scraper can pull it without session cookies. It is not
included in the redirect service's rate limiter check.

Tracked counter: `http_requests_total{service, method, status}`.

### Rate limiting
The redirect service applies an IP-based sliding-window rate limiter (default: 120 req
per 60 s) before touching the database. The rate limiter is in-process and injected as
a parameter in `handleRedirectRequest` so tests can control it. Stale entries are pruned
every 5 minutes via `setInterval`. The management-web does not apply rate limiting
(authenticated, low-traffic admin UI).

### Backup and restore
A `bun run db:backup` command (`packages/shared-db/backup.ts`) uses Bun's SQLite
`.backup()` online backup API to copy the live database to a timestamped file in
`./backups/`. A WAL checkpoint is issued first to flush any pending writes. The backup
is safe to run while either app is writing to the database.

## Consequences
**Positive:**
- Zero additional runtime dependencies.
- JSON logs are trivially ingested by any log aggregator (Loki, CloudWatch, Papertrail).
- Prometheus metrics are compatible with Grafana, Netdata, VictoriaMetrics, etc.
- Rate limiter protects the hot redirect path with no latency overhead.
- Backup is one command and produces a portable SQLite file.

**Negative:**
- In-process metrics are lost on process restart (counters reset to zero). Acceptable
  for a single-host deployment where Prometheus scrapes frequently.
- In-process rate limiter state is not shared across multiple instances. Acceptable for
  the current single-host architecture; would need to move to Redis or similar if the
  redirect service is horizontally scaled.
- No histogram metrics. Only request count and error rate are tracked; latency
  percentiles are not available without a histogram or summary type.

## Alternatives Considered
- **pino / winston logging library:** Adds a dependency and is not meaningfully simpler
  than a 30-line `logger.ts`. Rejected.
- **prom-client:** Full Prometheus client with histogram support. Heavier than needed
  for a single-host deployment. Deferred to Milestone 4 if histogram metrics are needed.
- **Redis-backed rate limiter:** Necessary for horizontal scaling but premature. Rejected
  for Milestone 3.
- **pg_dump / separate backup DB:** Overkill for SQLite. The online backup API is
  purpose-built for this use case.

## Follow-up
- If the redirect service is deployed on multiple hosts, replace the in-process rate
  limiter with a shared store (Redis or equivalent).
- If latency percentiles become a monitoring requirement, upgrade `metrics.ts` to
  use `prom-client` or add a simple histogram implementation.
- Evaluate log rotation and retention policy before production rollout.

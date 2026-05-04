# Docker Compose deployment

Compose runs **PostgreSQL**, a **one-shot migrate** container, **redirect** (Bun), and **portal** (Astro SSR via Node/`bun run start`). Source: repo root **`docker-compose.yml`** and **`docker/`** Dockerfiles.

## Quick start

1. **Hash the portal fixed password** (bcrypt):

   ```bash
   bun -e 'console.log(await Bun.password.hash("choose-a-strong-password"))'
   ```

2. **Env file**:

   ```bash
   cp .env.docker.example .env.docker
   ```

   Set **`PORTAL_AUTH_HASH`** to the string from step 1. Adjust **`PUBLIC_SHORT_BASE_URL`**, **`PORTAL_PUBLISH_PORT`**, **`REDIRECT_PUBLISH_PORT`** if needed.

3. **Start**:

   ```bash
   bun run compose:up
   ```

   Or: **`docker compose --env-file .env.docker up --build`**

4. Open **portal**: `http://localhost:4321` (default) → sign in with the password from step 1.  
   **Redirect**: `http://localhost:3000/<slug>` (default).

**API keys** (`/api/v1/*`) are unaffected by portal session login—they use Bearer keys from the portal UI.

## Services

| Service     | Purpose |
|------------|---------|
| `postgres` | Data store; credential `postgres` / `postgres` (change for real deploy). |
| `migrate`  | Runs **`packages/db/migrations/`** once; requires Compose **v2.20+** for `service_completed_successfully`. |
| `redirect` | `GET /:slug`, `/healthz`; optional **rate limit** via env (`REDIRECT_RATE_LIMIT_*`). |
| `portal`   | Uses **`AUTH_MODE=session`** and **`PORTAL_AUTH_HASH`** (fixed shared password via `/login`). |

## Redirect rate limiting

Configured in Compose via **`REDIRECT_RATE_LIMIT_*`**:

- **`REDIRECT_RATE_LIMIT_ENABLED`** — `true` / `1` to enable  
- **`REDIRECT_RATE_LIMIT_WINDOW_MS`** — window length  
- **`REDIRECT_RATE_LIMIT_MAX`** — max **GET** requests per window per resolved client IP (same rules as **`TRUST_PROXY_HOPS`** + `X-Forwarded-For`)

**`/healthz` is never rate-limited.**

In-memory buckets do not span multiple redirect replicas; scale-out needs a shared limiter later.

## Production notes

Swap demo DB credentials for managed Postgres, TLS termination in front of both ports, backups, and the checklist in **`docs/PRODUCTION_PLAN.md`**. Compose here is oriented at **local / demo parity**, not hardened production topology.

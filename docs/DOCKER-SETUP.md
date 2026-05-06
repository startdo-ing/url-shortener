# Docker Setup and Deployment Guide

## Overview

This application uses Docker Compose to deploy two services (management-web and redirect-service) that share a persistent SQLite database. This guide explains the deployment architecture and how data persists across rebuilds.

## Architecture

### Services

- **management-web**: Astro-based management dashboard on port 3916 → 3000
- **redirect-service**: URL redirect service on port 8915 → 8000

Both services share the same SQLite database at `/data/db.sqlite` for consistency.

### Volume Strategy

A named Docker volume `url-shortener_db-data` stores the SQLite database persistently:

```yaml
volumes:
  db-data:
    driver: local
```

This volume is **independent of container and image lifecycles**, meaning:
- Data persists across `docker compose build`
- Data persists across container restarts
- Data is only deleted if you explicitly run `docker compose down -v`

## Database Migrations

### Why Migrations Run at Runtime (Not Build Time)

**At build time:**
- The volume `/data` does not exist
- Docker is building an image in isolation
- Any database file created would be lost (not persisted)

**At runtime:**
- Docker Compose creates and mounts the volume
- The container has access to `/data`
- Migrations write to the persistent `/data/db.sqlite`

### Migration Flow

1. **Container starts** with the `/startup.sh` script (management-web only)
2. **Migrations run** via `bun run --cwd /app/packages/shared-db migrate`
3. **Schema check** happens at `packages/shared-db/migrate.ts`:
   - Reads `DATABASE_PATH` env var (set to `/data/db.sqlite`)
   - Logs diagnostic info: expected vs received path
   - Runs `drizzle-orm` migrator from `packages/shared-db/migrations/`
4. **Migrations are idempotent** — running multiple times is safe
5. **App starts** after migrations complete

### Why Only management-web Runs Migrations

Both services share the same database, so running migrations twice is wasteful:

- **management-web startup script**: Runs migrations (first to start via `depends_on`)
- **redirect-service**: Starts without running migrations (schema already exists)

## Deployment

### Prerequisites

- Docker and Docker Compose installed on VPS
- `.env` file at repo root with:
  ```env
  DATABASE_PATH=/data/db.sqlite
  KEYCLOAK_URL=https://auth.startdo.ing
  KEYCLOAK_REALM=startdoing
  KEYCLOAK_CLIENT_ID=url-shortener-management-web
  KEYCLOAK_CLIENT_SECRET=<your-secret>
  SESSION_SECRET=<at-least-32-chars>
  APP_URL=https://short.anh.pw
  REDIRECT_APP_URL=https://c.anh.pw
  NODE_ENV=production
  ```

### First Deployment

```bash
cd ~/startdo.ing/url-shortener

# Pull latest code
git pull

# Build images
docker compose build --no-cache

# Start services (creates volume, runs migrations, starts apps)
docker compose up -d

# Watch startup logs
docker compose logs -f --tail=50
```

Expected startup output:
```
management-web-1  | [STARTUP] Running migrations...
management-web-1  | [MIGRATE] Starting migration script
management-web-1  | [MIGRATE] Expected: DATABASE_PATH env var set
management-web-1  | [MIGRATE] Received: /data/db.sqlite
management-web-1  | [DB] DATABASE_PATH=/data/db.sqlite
management-web-1  | [STARTUP] Starting management-web...
```

### Subsequent Deployments (After Code Changes)

```bash
cd ~/startdo.ing/url-shortener

# Pull latest code
git pull

# Rebuild images (volume persists)
docker compose build --no-cache

# Recreate containers with new image
docker compose up -d

# Verify startup
docker compose logs -f --tail=30
```

Data in `/data/db.sqlite` is preserved. Migrations re-run but detect existing schema and skip.

## Environment Variables

Set only in `.env` (repo root), loaded via `env_file: .env` in docker-compose.yml:

| Variable | Purpose | Example |
|---|---|---|
| `DATABASE_PATH` | SQLite file location inside container | `/data/db.sqlite` |
| `KEYCLOAK_URL` | Keycloak base URL | `https://auth.startdo.ing` |
| `KEYCLOAK_REALM` | Keycloak realm name | `startdoing` |
| `KEYCLOAK_CLIENT_ID` | Keycloak client ID | `url-shortener-management-web` |
| `KEYCLOAK_CLIENT_SECRET` | Keycloak client secret | (generated in Keycloak) |
| `SESSION_SECRET` | Session encryption key | (random, ≥32 chars) |
| `APP_URL` | Management web URL | `https://short.anh.pw` |
| `REDIRECT_APP_URL` | Redirect service URL | `https://c.anh.pw` |
| `NODE_ENV` | Environment | `production` |

## Troubleshooting

### "no such table: users"

**Cause:** Database exists but migrations haven't run (schema not applied).

**Fix:**
```bash
# Check if migrations ran on startup
docker compose logs management-web | grep -i migration

# If missing, manually trigger
docker compose exec management-web bun run --cwd /app/packages/shared-db migrate

# Restart apps
docker compose restart
```

### Database file doesn't exist

**Cause:** Volume not created yet or path is wrong.

**Check:**
```bash
# List Docker volumes
docker volume ls | grep url-shortener

# Inspect volume
docker volume inspect url-shortener_db-data

# Check file inside volume
docker run -v url-shortener_db-data:/data alpine ls -lh /data/
```

### env vars not being read

**Cause:** `.env` is in wrong location or not loaded.

**Check:**
```bash
# Verify .env exists at repo root
cat ~/startdo.ing/url-shortener/.env | head

# Verify docker-compose is reading it
docker compose config | grep DATABASE_PATH

# Check inside running container
docker compose exec management-web printenv | grep DATABASE_PATH
```

### Data lost after rebuild

**Only happens if you explicitly delete the volume:**

```bash
# ⚠️ THIS DELETES DATA
docker compose down -v

# ❌ Don't do this unless you want to reset
```

**Safe operations (data preserved):**
```bash
docker compose build --no-cache    # ✅ Rebuilds image, keeps volume
docker compose up -d               # ✅ Restarts containers, keeps volume
docker compose restart             # ✅ Restarts containers, keeps volume
```

## Monitoring

### View Logs

```bash
# All services, last 50 lines
docker compose logs --tail=50

# Follow live output
docker compose logs -f

# Just management-web
docker compose logs -f management-web

# Just redirect-service
docker compose logs -f redirect-service
```

### Check Service Status

```bash
# List running containers
docker compose ps

# Show container details
docker compose ps -a

# Get startup errors
docker compose logs management-web | head -100
```

### Database Inspection

```bash
# Connect to SQLite inside management-web
docker compose exec management-web sqlite3 /data/db.sqlite

# Once connected, try:
sqlite> .tables
sqlite> SELECT COUNT(*) FROM users;
sqlite> .quit
```

## Local Development vs. Docker

| Environment | Database | Location | Notes |
|---|---|---|---|
| Local dev | `dev.sqlite` | Repo root | Uses `bun run dev` |
| Docker | `db.sqlite` | `/data` volume | Uses `docker compose up` |

**Do NOT mix them** — local dev and Docker use separate databases. 

If you need local data in Docker:
```bash
# Copy local db to volume (destructive!)
docker volume inspect url-shortener_db-data  # Get mount path
cp ~/startdo.ing/url-shortener/dev.sqlite <mount-path>/db.sqlite
docker compose restart
```

## Deployment Checklist

- [ ] `.env` created at repo root with all required vars
- [ ] `.env` is in `.gitignore` (should be)
- [ ] `.dockerignore` exists and excludes `node_modules`, `dist`, `.env`
- [ ] Run `git pull` for latest code
- [ ] Run `docker compose build --no-cache`
- [ ] Run `docker compose up -d`
- [ ] Check logs: `docker compose logs --tail=100`
- [ ] Verify no "error" or "failed" messages
- [ ] Test web: `curl -I https://short.anh.pw`
- [ ] Test redirect: `curl -I https://c.anh.pw`

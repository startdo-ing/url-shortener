# ADR-009: Docker Compose for Deployment

## Status
Accepted

## Context
Both apps need a consistent, reproducible deployment strategy. The project runs on Bun with a SQLite file database, which simplifies container setup since no database container is needed.

## Decision
Use Docker Compose to deploy both apps together.

Service layout:
- `management-web` — Remix dashboard app container
- `redirect-service` — Bun redirect app container
- Shared SQLite database file mounted as a Docker volume accessible to both containers

Port mapping:
- `management-web`: host port `3915` → container port `3000`
- `redirect-service`: host port `8915` → container port `8000`

These host ports are fixed and must be reflected in any reverse proxy (e.g. Caddy, nginx) configuration on the host.

Compose structure:
```
services:
  management-web:
    build: ./apps/management-web
    ports:
      - "3915:3000"
    volumes:
      - db-data:/data
    environment:
      - DATABASE_PATH=/data/db.sqlite
      - ...

  redirect-service:
    build: ./apps/redirect-service
    ports:
      - "8915:8000"
    volumes:
      - db-data:/data
    environment:
      - DATABASE_PATH=/data/db.sqlite
      - ...

volumes:
  db-data:
```

WAL mode requirement:
- Both containers access the same SQLite file via shared volume.
- WAL mode must be enabled at connection time in both apps.
- Write contention is low by design (redirect-service writes only async click events).

## Consequences
Positive:
- Single `docker compose up` brings the full system up.
- No external database service required.
- Easy to run on any VPS or self-hosted environment.
- Volume-based SQLite is simple and portable.

Negative:
- Volume backup must be coordinated (file must not be written during backup).

Notes:
- This is a single-user personal app. Both containers run on the same host by design.
- Horizontal scaling is not a requirement and not a concern for this project.

## Alternatives Considered
1. Kubernetes
- Rejected as over-engineered for current scale.

2. Separate database container (PostgreSQL)
- Rejected in favor of zero-dependency SQLite (see ADR-008).

## Follow-up
- `docker-compose.yml` created at project root. ✓
- `Dockerfile` created for each app. ✓
- Define `.env.example` with all required environment variables.
- Document backup procedure for SQLite volume.
- No scaling strategy required. Single-host Docker Compose is the permanent deployment target.

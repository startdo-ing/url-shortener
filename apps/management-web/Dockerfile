FROM oven/bun:latest AS builder
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
RUN bun run --cwd apps/management-web build

# Production image
FROM oven/bun:latest AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy everything from builder so all workspace deps resolve correctly
COPY --from=builder /app .

WORKDIR /app/apps/management-web

# Entrypoint script: Runs database migrations, then starts the app.
# Migrations are idempotent (safe to run multiple times).
# They detect the existing schema and skip if already applied.
# See docs/DOCKER-SETUP.md for detailed explanation.
RUN echo '#!/bin/sh\nset -e\necho "[STARTUP] Running migrations..."\nbun run --cwd /app/packages/shared-db migrate\necho "[STARTUP] Starting management-web..."\nexec bun run start' > /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 3000

CMD ["/entrypoint.sh"]

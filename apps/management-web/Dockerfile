FROM oven/bun:latest AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock* ./
COPY apps/management-web/package.json apps/management-web/package.json
COPY apps/redirect-service/package.json apps/redirect-service/package.json
COPY packages/shared-db/package.json packages/shared-db/package.json
RUN bun install --frozen-lockfile

# Production image
FROM oven/bun:latest AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY apps/management-web ./apps/management-web
COPY packages/shared-db ./packages/shared-db

WORKDIR /app/apps/management-web

EXPOSE 3000

CMD ["bun", "run", "start"]

FROM oven/bun:latest AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock* ./
COPY apps/management-web-astro/package.json apps/management-web-astro/package.json
COPY apps/redirect-service/package.json apps/redirect-service/package.json
COPY packages/shared-db/package.json packages/shared-db/package.json
RUN bun install --frozen-lockfile

# Build the Astro app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/management-web-astro ./apps/management-web-astro
COPY packages/shared-db ./packages/shared-db
COPY package.json ./
WORKDIR /app/apps/management-web-astro
RUN bunx --bun astro build

# Production image
FROM oven/bun:latest AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/management-web-astro/dist ./apps/management-web-astro/dist
COPY apps/management-web-astro/package.json ./apps/management-web-astro/package.json
COPY packages/shared-db ./packages/shared-db

WORKDIR /app/apps/management-web-astro

EXPOSE 3000

CMD ["bun", "run", "start"]

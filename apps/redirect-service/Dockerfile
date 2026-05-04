FROM oven/bun:latest AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock* ./
COPY packages/shared-db/package.json packages/shared-db/package.json
COPY apps/redirect-service/package.json apps/redirect-service/package.json
RUN bun install --frozen-lockfile

# Production image
FROM oven/bun:latest AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 8000

CMD ["bun", "run", "src/index.ts"]

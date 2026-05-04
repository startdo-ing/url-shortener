FROM oven/bun:latest AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock* ./
COPY ../../packages/shared-db/package.json ../../packages/shared-db/package.json
RUN bun install --frozen-lockfile

# Build the Remix app
FROM deps AS build
COPY . .
RUN bun run build

# Production image
FROM oven/bun:latest AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/build ./build
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3000

CMD ["bun", "run", "start"]

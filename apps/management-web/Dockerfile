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

EXPOSE 3000

CMD ["bun", "run", "start"]

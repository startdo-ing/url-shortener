FROM oven/bun:latest AS builder
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
RUN bun run --cwd apps/management-web build

# Production image
FROM oven/bun:latest AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/management-web/node_modules ./apps/management-web/node_modules
COPY --from=builder /app/apps/management-web/dist ./apps/management-web/dist
COPY --from=builder /app/apps/management-web/package.json ./apps/management-web/package.json
COPY --from=builder /app/packages/shared-db ./packages/shared-db

WORKDIR /app/apps/management-web

EXPOSE 3000

CMD ["bun", "run", "start"]

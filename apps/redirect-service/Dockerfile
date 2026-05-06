FROM oven/bun:latest
WORKDIR /app

ENV NODE_ENV=production

COPY . .
RUN bun install --frozen-lockfile

WORKDIR /app/apps/redirect-service

EXPOSE 8000

CMD ["bun", "run", "start"]

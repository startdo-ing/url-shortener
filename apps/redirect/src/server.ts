import postgres from "postgres";
import { handleRedirectRequest } from "./handler";
import { resolveClientIp } from "./ip";
import { createPostgresDeps } from "./postgres";
import { createRedirectRateLimiter } from "./rate-limit";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const port = Number(process.env.PORT ?? "3000");
const host = process.env.HOST ?? "0.0.0.0";
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? "0");

const sql = postgres(DATABASE_URL);
const deps = createPostgresDeps(sql, Number.isFinite(trustProxyHops) ? trustProxyHops : 0);

const RL_CT = "text/plain;charset=UTF-8";
const rlEnabled =
  process.env.REDIRECT_RATE_LIMIT_ENABLED === "true" || process.env.REDIRECT_RATE_LIMIT_ENABLED === "1";
const rlWindowMs = Number(process.env.REDIRECT_RATE_LIMIT_WINDOW_MS ?? "60000");
const rlMax = Number(process.env.REDIRECT_RATE_LIMIT_MAX ?? "120");
const rateLimiter =
  rlEnabled && Number.isFinite(rlWindowMs) && rlWindowMs > 0 && Number.isFinite(rlMax) && rlMax > 0
    ? createRedirectRateLimiter({
        windowMs: rlWindowMs,
        max: Math.floor(rlMax),
        now: () => Date.now(),
      })
    : null;

if (rateLimiter) {
  console.warn(
    `redirect rate limit ON: ${Math.floor(rlMax)} requests / ${Math.floor(rlWindowMs)} ms per IP (healthz exempt)`,
  );
}

Bun.serve({
  hostname: host,
  port,
  fetch(req, server) {
    const info = server.requestIP(req);
    const direct = info?.address ?? null;

    if (rateLimiter) {
      const path = new URL(req.url).pathname;
      if (path !== "/healthz") {
        const key = resolveClientIp(req.headers, deps.trustProxyHops, direct) ?? "unknown";
        const hit = rateLimiter.check(key);
        if (!hit.ok) {
          return new Response("Too Many Requests", {
            status: 429,
            headers: new Headers({
              "content-type": RL_CT,
              "retry-after": String(hit.retryAfterSec),
            }),
          });
        }
      }
    }

    return handleRedirectRequest(req, direct, deps);
  },
});

console.warn(`redirect listening http://${host}:${port}`);

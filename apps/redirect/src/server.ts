import postgres from "postgres";
import { createPostgresDeps } from "./postgres";
import { handleRedirectRequest } from "./handler";

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

Bun.serve({
  hostname: host,
  port,
  fetch(req, server) {
    const info = server.requestIP(req);
    const direct = info?.address ?? null;
    return handleRedirectRequest(req, direct, deps);
  },
});

console.warn(`redirect listening http://${host}:${port}`);

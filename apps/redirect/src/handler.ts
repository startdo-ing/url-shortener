import { parseSingleSlugSegment } from "@url-shortener/core";
import type { ClickInsert, RedirectDeps } from "./types";
import { resolveClientIp } from "./ip";

const NOT_FOUND_BODY = "Not Found";
const CT = "text/plain;charset=utf-8";
const NOT_FOUND_HEADERS = new Headers({ "content-type": CT });

function notFound(): Response {
  return new Response(NOT_FOUND_BODY, { status: 404, headers: NOT_FOUND_HEADERS });
}

/**
 * Scheduled so redirect Response is constructed before persistence runs (**R-006**).
 * Enrichment runs after insert (**ADR-0003**); failures are swallowed.
 */
function scheduleInsertClick(deps: RedirectDeps, row: ClickInsert, requestHeaders: Headers): void {
  queueMicrotask(() => {
    void (async () => {
      try {
        const id = await deps.insertClick(row);
        await deps.enrichClick(id, requestHeaders);
      } catch {
        /* R-006 — never propagate to caller */
      }
    })();
  });
}

export async function handleRedirectRequest(req: Request, directIp: string | null, deps: RedirectDeps): Promise<Response> {
  if (req.method !== "GET") {
    return notFound();
  }

  const url = new URL(req.url);
  const pathname = url.pathname;

  if (pathname === "/healthz") {
    return new Response("ok", { status: 200, headers: new Headers({ "content-type": CT }) });
  }

  const slug = parseSingleSlugSegment(pathname);
  if (slug == null) {
    return notFound();
  }

  const row = await deps.findLinkBySlug(slug);
  if (row == null) {
    return notFound();
  }

  const nowMs = deps.now().getTime();
  if (row.status === "paused") {
    return notFound();
  }
  if (row.expires_at != null && row.expires_at.getTime() <= nowMs) {
    return notFound();
  }

  const status = row.redirect_type;
  const res = new Response(null, {
    status,
    headers: new Headers({ Location: row.destination_url }),
  });

  const ip = resolveClientIp(req.headers, deps.trustProxyHops, directIp);
  const payload: ClickInsert = {
    linkId: row.id,
    ip,
    referrer: req.headers.get("referer"),
    userAgent: req.headers.get("user-agent"),
    acceptLanguage: req.headers.get("accept-language"),
  };
  scheduleInsertClick(deps, payload, req.headers);

  return res;
}

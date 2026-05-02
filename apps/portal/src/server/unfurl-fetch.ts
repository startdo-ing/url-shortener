import { isSsrfBlockedUrl, validateDestinationUrl } from "@url-shortener/core";

const MAX_REDIRECTS = 5;
const MAX_MS = 5000;
const MAX_BODY = 512 * 1024;

export type UnfurlFailureReason =
  | "invalid_destination"
  | "ssrf_blocked"
  | "redirect_loop"
  | "fetch_error"
  | "timeout";

async function readBodyCapped(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      if (total + value.byteLength <= maxBytes) {
        chunks.push(value);
        total += value.byteLength;
      } else {
        const rest = maxBytes - total;
        if (rest > 0) chunks.push(value.subarray(0, rest));
        total = maxBytes;
        await reader.cancel().catch(() => {});
        break;
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
  }
  const merged = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    merged.set(c, o);
    o += c.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

function redirectUrl(response: Response, currentUrl: string): string | null {
  const loc = response.headers.get("location");
  if (loc == null || loc === "") return null;
  try {
    return new URL(loc, currentUrl).href;
  } catch {
    return null;
  }
}

const REDIRECT_STATUS = new Set([301, 302, 303, 307, 308]);

/**
 * ADR-0002: bounded GET with manual redirects, SSRF checks each hop.
 */
export async function unfurlDestination(
  rawDestination: string,
  fetchFn: typeof fetch,
): Promise<
  | { ok: true; finalUrl: string; html: string }
  | { ok: false; reason: UnfurlFailureReason }
> {
  const validated = validateDestinationUrl(rawDestination);
  if (!validated.ok) return { ok: false, reason: "invalid_destination" };

  let url = new URL(validated.normalized);
  if (isSsrfBlockedUrl(url)) return { ok: false, reason: "ssrf_blocked" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MAX_MS);

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await fetchFn(url.href, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": "url-shortener-portal-preview/1",
          accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
        },
      });

      if (REDIRECT_STATUS.has(res.status)) {
        const next = redirectUrl(res, url.href);
        if (!next) return { ok: false, reason: "fetch_error" };
        if (hop === MAX_REDIRECTS) return { ok: false, reason: "redirect_loop" };
        try {
          url = new URL(next);
        } catch {
          return { ok: false, reason: "fetch_error" };
        }
        if (isSsrfBlockedUrl(url)) return { ok: false, reason: "ssrf_blocked" };
        continue;
      }

      if (!res.ok) return { ok: false, reason: "fetch_error" };

      const ct = (res.headers.get("content-type") ?? "").toLowerCase();
      if (!ct.includes("text/html") && !ct.includes("application/xhtml")) {
        return { ok: false, reason: "fetch_error" };
      }

      const html = await readBodyCapped(res, MAX_BODY);
      return { ok: true, finalUrl: url.href, html };
    }
    return { ok: false, reason: "redirect_loop" };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") return { ok: false, reason: "timeout" };
    return { ok: false, reason: "fetch_error" };
  } finally {
    clearTimeout(timer);
  }
}

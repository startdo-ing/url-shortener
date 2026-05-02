import { describe, expect, mock, test } from "bun:test";
import { unfurlDestination } from "./unfurl-fetch";

function reqUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  if (input instanceof Request) return input.url;
  return String(input);
}

describe("unfurlDestination — R-024", () => {
  test("localhost URL never calls fetch", async () => {
    const fetchFn = mock(() => Promise.reject(new Error("should not fetch")));
    const r = await unfurlDestination("http://127.0.0.1/", fetchFn as unknown as typeof fetch);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("ssrf_blocked");
    expect((fetchFn as ReturnType<typeof mock>).mock.calls.length).toBe(0);
  });

  test("10.x URL never calls fetch", async () => {
    const fetchFn = mock(() => Promise.reject(new Error("should not fetch")));
    const r = await unfurlDestination("http://10.1.2.3/x", fetchFn as unknown as typeof fetch);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("ssrf_blocked");
    expect((fetchFn as ReturnType<typeof mock>).mock.calls.length).toBe(0);
  });

  test("HTML fixture asserts OG fields via extractTargetPreviewFromHtml", async () => {
    const html = `<!DOCTYPE html><html><head>
      <meta property="og:title" content="Hi" />
      <meta property="og:description" content="Desc" />
      </head><body></body></html>`;
    const fetchFn = mock((_input: RequestInfo) =>
      Promise.resolve(
        new Response(html, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      ),
    );
    const r = await unfurlDestination("https://example.org/page", fetchFn as unknown as typeof fetch);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.finalUrl).toContain("example.org");
      const { extractTargetPreviewFromHtml } = await import("@url-shortener/core");
      const { preview } = extractTargetPreviewFromHtml(r.html, r.finalUrl);
      expect(preview.title).toBe("Hi");
      expect(preview.description).toBe("Desc");
    }
  });

  test("redirect hop to private host is blocked", async () => {
    let n = 0;
    const fetchFn = mock((input: RequestInfo) => {
      const url = reqUrl(input);
      n++;
      if (n === 1 && url.includes("example.com")) {
        return Promise.resolve(
          new Response(null, {
            status: 302,
            headers: { Location: "http://192.168.1.1/secret" },
          }),
        );
      }
      return Promise.reject(new Error(`unexpected fetch ${url}`));
    });
    const r = await unfurlDestination("https://example.com/start", fetchFn as unknown as typeof fetch);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("ssrf_blocked");
  });
});

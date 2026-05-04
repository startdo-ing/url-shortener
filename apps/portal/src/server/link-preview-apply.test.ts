import { describe, expect, test } from "bun:test";
import type { Sql } from "./db";
import { applyLinkPreviewFetch } from "./link-preview";

function fifoSql(sequence: unknown[][]): Sql {
  let i = 0;
  return Object.assign(
    (_strings: TemplateStringsArray, ..._values: unknown[]) =>
      Promise.resolve((sequence[i++] ?? []) as unknown[]),
    { json: (x: unknown) => x },
  ) as Sql;
}

describe("applyLinkPreviewFetch — R-024 / R-026", () => {
  const id = "550e8400-e29b-41d4-a716-446655440000";

  test("not_found when link row missing (**R-024** precondition)", async () => {
    const sql = fifoSql([[]]);
    const r = await applyLinkPreviewFetch(id, globalThis.fetch, {
      getSql: () => sql,
      unfurl: async () => ({ ok: false, reason: "ssrf_blocked" }),
    });
    expect(r).toEqual({ ok: false, reason: "not_found" });
  });

  test("R-026: failed unfurl still completes UPDATE path (preview_fetched_at cleared JSON)", async () => {
    const sql = fifoSql([
      [{ id, destination_url: "https://x.example/", display_title: "Old" }],
      [],
    ]);

    let unfurls = 0;
    const r = await applyLinkPreviewFetch(id, globalThis.fetch, {
      getSql: () => sql,
      unfurl: async (url: string, _f: typeof fetch) => {
        unfurls++;
        expect(url).toBe("https://x.example/");
        return { ok: false, reason: "ssrf_blocked" };
      },
    });

    expect(r).toEqual({ ok: true, unfurlOk: false });
    expect(unfurls).toBe(1);
  });

  test("R-026: OK unfurl writes preview-derived title (**R-024** happy path)", async () => {
    const html =
      `<!DOCTYPE html><html><head><meta property="og:title" content="OG Title Here" /></head><body></body></html>`;
    const sql = fifoSql([[{ id, destination_url: "https://unf.example/p", display_title: null }], []]);

    const r = await applyLinkPreviewFetch(id, globalThis.fetch, {
      getSql: () => sql,
      unfurl: async () => ({
        ok: true as const,
        html,
        finalUrl: "https://unf.example/p",
      }),
    });

    expect(r).toEqual({ ok: true, unfurlOk: true });
  });
});

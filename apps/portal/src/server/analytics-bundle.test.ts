import { describe, expect, test } from "bun:test";
import { getGlobalAnalytics, getSlugAnalytics, type AnalyticsRange } from "./analytics";
import type { Sql } from "./db";

function fifoSql(sequence: unknown[][]): Sql {
  let i = 0;
  return Object.assign(
    (_strings: TemplateStringsArray, ..._values: unknown[]) =>
      Promise.resolve((sequence[i++] ?? []) as unknown[]),
    { json: (x: unknown) => x },
  ) as Sql;
}

describe("getGlobalAnalytics — R-009 / R-011", () => {
  test("fixture SQL rows consolidate into AnalyticsBundle shape (all traffic)", async () => {
    const range: AnalyticsRange = { from: "2026-01-01", to: "2026-01-03", humanOnly: false };
    /* fifo slot [0]: embedded `humanOnly=false` helper fragment (`sql``). */
    const seq = [
      [],
      [{ c: "10" }],
      [
        { country_code: "US", clicks: 7 },
        { country_code: "??", clicks: 3 },
      ],
      [{ label: "desktop", clicks: 8 }, { label: "mobile", clicks: 2 }],
      [{ label: "Chrome", clicks: 5 }],
      [{ day: "2026-01-01", clicks: 4 }, { day: "2026-01-02", clicks: 6 }],
    ];

    /* Six postgres-js invocations on this path: [0]=merged HF fragment slot + five SELECT awaits. */
    expect(seq.length).toBe(6);

    const b = await getGlobalAnalytics(fifoSql(seq), range);
    expect(b.totalClicks).toBe(10);
    expect(b.byCountry.find((x) => x.country_code === "US")!.clicks).toBe(7);
    expect(b.byDevice.some((x) => x.label === "desktop")).toBe(true);
    expect(b.byDay).toHaveLength(2);
  });

  test("R-011 humanOnly keeps bundle assembly contract (fixture parity)", async () => {
    const range: AnalyticsRange = { from: "2026-01-01", to: "2026-01-02", humanOnly: true };
    const seq = [
      [], // `humanOnly=true` ⇒ first fragment is AND clause, still one fifo pop
      [{ c: "2" }],
      [{ country_code: "CA", clicks: 2 }],
      [{ label: "desktop", clicks: 2 }],
      [{ label: "Safari", clicks: 2 }],
      [{ day: "2026-01-01", clicks: 2 }],
    ];

    expect(seq.length).toBe(6);

    const b = await getGlobalAnalytics(fifoSql(seq), range);
    expect(b.totalClicks).toBe(2);
    expect(b.byCountry.every((row) => row.clicks <= b.totalClicks)).toBe(true);
  });
});

describe("getSlugAnalytics — R-009", () => {
  const range: AnalyticsRange = { from: "2026-02-01", to: "2026-02-05", humanOnly: false };

  test("unknown slug terminates before aggregate queries (**R-002** class analogue)", async () => {
    const sql = fifoSql([[]]);
    const r = await getSlugAnalytics(sql, "missing", range);
    expect(r).toBe("unknown_slug");
  });

  test("known slug returns same dimensional sections as global scoping helpers", async () => {
    const seq = [
      [{ id: "550e8400-e29b-41d4-a716-446655440000" }],
      [], // nested humanOnly=false helper fragment (`sql``)
      [{ c: "4" }],
      [{ country_code: "DE", clicks: 4 }],
      [{ label: "desktop", clicks: 4 }],
      [{ label: "Firefox", clicks: 3 }],
      [{ day: "2026-02-03", clicks: 4 }],
    ];

    expect(seq.length).toBe(7);

    const b = await getSlugAnalytics(fifoSql(seq), "go", range);
    if (b === "unknown_slug") throw new Error("expected bundle");
    expect(b.totalClicks).toBe(4);
    expect(b.byCountry[0]!.country_code).toBe("DE");
  });
});

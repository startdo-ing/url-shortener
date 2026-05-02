import { describe, expect, test } from "bun:test";
import { countryRollupToMap, MAX_ANALYTICS_RANGE_DAYS, parseAnalyticsSearchParams } from "./analytics";

describe("parseAnalyticsSearchParams — R-009 / R-011", () => {
  test("defaults to last 14 UTC days when params absent", () => {
    const fixed = new Date(Date.UTC(2026, 5, 15));
    const r = parseAnalyticsSearchParams(new URLSearchParams(), fixed);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.range.to).toBe("2026-06-15");
    expect(r.range.from).toBe("2026-06-02");
    expect(r.range.humanOnly).toBe(false);
  });

  test("honours from, to, human=1", () => {
    const sp = new URLSearchParams("from=2026-01-01&to=2026-01-07&human=1");
    const r = parseAnalyticsSearchParams(sp, new Date("2026-06-01"));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.range.from).toBe("2026-01-01");
    expect(r.range.to).toBe("2026-01-07");
    expect(r.range.humanOnly).toBe(true);
  });

  test("human=0 is not humans-only", () => {
    const r = parseAnalyticsSearchParams(new URLSearchParams("human=0"), new Date("2026-06-01"));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.range.humanOnly).toBe(false);
  });

  test("rejects from after to", () => {
    const r = parseAnalyticsSearchParams(new URLSearchParams("from=2026-02-01&to=2026-01-01"));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("from_after_to");
  });

  test("rejects bad date format", () => {
    const r = parseAnalyticsSearchParams(new URLSearchParams("from=not-a-date&to=2026-01-01"));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("bad_from");
  });

  test("rejects range over cap", () => {
    const r = parseAnalyticsSearchParams(
      new URLSearchParams("from=2020-01-01&to=2026-01-01"),
      new Date("2026-06-01"),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("range_too_long");
    expect(MAX_ANALYTICS_RANGE_DAYS).toBeGreaterThan(300);
  });
});

describe("countryRollupToMap — R-010", () => {
  test("JSON map matches seeded aggregates", () => {
    const rows = [
      { country_code: "US", clicks: 3 },
      { country_code: "??", clicks: 1 },
    ];
    expect(countryRollupToMap(rows)).toEqual({ US: 3, "??": 1 });
  });
});

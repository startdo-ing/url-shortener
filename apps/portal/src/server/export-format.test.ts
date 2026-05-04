import { describe, expect, test } from "bun:test";
import { escapeCsvCell, exportLinksToCsv, exportLinksToJson, type ExportLinkRow } from "./export-format";

describe("export format — R-030", () => {
  const sample: ExportLinkRow[] = [
    {
      slug: "hi",
      destination_url: "https://example.com/page",
      status: "active",
      redirect_type: 302,
      created_at: new Date("2026-03-01T12:00:00.000Z"),
      updated_at: new Date("2026-03-02T09:30:00.000Z"),
      click_count: 7,
    },
  ];

  test("CSV includes header row and rollup click_count column", () => {
    const csv = exportLinksToCsv(sample);
    expect(csv.startsWith("slug,destination_url,status,")).toBe(true);
    expect(csv).toContain("https://example.com/page");
    expect(csv).toContain(",7\n");
  });

  test("escapeCsvCell quotes fields with commas and newlines", () => {
    expect(escapeCsvCell("plain")).toBe("plain");
    expect(escapeCsvCell('say "hello"')).toContain('""');
    expect(escapeCsvCell("one,two")).toMatch(/^".*"$/);
  });

  test("JSON export round-trips aggregates with ISO timestamps", () => {
    const j = exportLinksToJson(sample);
    const parsed = JSON.parse(j) as unknown[];
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0]).toMatchObject({
      slug: "hi",
      click_count: 7,
      created_at: "2026-03-01T12:00:00.000Z",
    });
  });
});

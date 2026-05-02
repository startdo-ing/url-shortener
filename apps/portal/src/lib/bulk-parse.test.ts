import { describe, expect, test } from "bun:test";
import { parseBulkPaste } from "./bulk-parse";

describe("parseBulkPaste — R-029", () => {
  test("five-line batch with line 3 malformed reports error on line 3", () => {
    const text = `https://a.example/x
https://b.example/y
not-a-url
https://d.example/z
https://e.example/w`;
    const rows = parseBulkPaste(text);
    const bad = rows.find((r) => r.lineNumber === 3);
    expect(bad?.error).toBeTruthy();
    expect(bad?.error).toContain("http/https");
    const good = rows.filter((r) => r.error == null && r.raw.trim() !== "");
    expect(good.length).toBe(4);
  });

  test("TAB second column slug", () => {
    const rows = parseBulkPaste("https://x.test/\tmy-tab-slug");
    expect(rows[0]?.error).toBeNull();
    expect(rows[0]?.destination_url).toBe("https://x.test/");
    expect(rows[0]?.slugField).toBe("my-tab-slug");
  });

  test("comma second column", () => {
    const rows = parseBulkPaste("https://y.test/,comma-slug");
    expect(rows[0]?.slugField).toBe("comma-slug");
  });

  test("blank lines preserved line numbers but skipped in logic", () => {
    const rows = parseBulkPaste("https://a.test/\n\njavascript:evil()");
    const line2 = rows.find((r) => r.lineNumber === 2);
    expect(line2?.raw).toBe("");
    expect(line2?.error).toBeNull();
    const line3 = rows.find((r) => r.lineNumber === 3);
    expect(line3?.error).toBeTruthy();
  });
});

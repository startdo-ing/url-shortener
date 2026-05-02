import { describe, expect, test } from "bun:test";
import { notesMarkdownTooLarge, plainNotesExcerpt, renderNotesMarkdown } from "./render-notes";

describe("renderNotesMarkdown — R-027 XSS", () => {
  test("escapes raw HTML and does not emit executable handlers", () => {
    const html = renderNotesMarkdown(`Hello <script>alert(1)</script> <img src=x onerror=alert(1)>`);
    expect(html.toLowerCase()).not.toContain("<script");
    expect(html.toLowerCase()).not.toContain("<img");
    expect(html).not.toMatch(/<[^>]*\bonerror\b\s*=/i);
    expect(html).toContain("&lt;script&gt;");
  });

  test("javascript scheme links are not emitted as anchors", () => {
    const md = "[clickme](javascript:alert(1))";
    const html = renderNotesMarkdown(md);
    expect(html).not.toMatch(/href\s*=\s*["']?\s*javascript:/i);
  });

  test("GFM table renders stable table structure", () => {
    const md = "| a | b |\n|---|---|\n| 1 | 2 |\n";
    const html = renderNotesMarkdown(md);
    expect(html).toContain("<table");
    expect(html).toContain("<thead");
    expect(html).toContain("<tbody");
    expect(html).toContain("<th");
    expect(html).toContain("<td");
  });

  test("http(s) links survive with rel", () => {
    const html = renderNotesMarkdown("[ok](https://example.com/path)");
    expect(html).toContain('href="https://example.com/path"');
    expect(html).toContain("noopener");
  });
});

describe("notesMarkdownTooLarge", () => {
  test("rejects body over 64KB UTF-8", () => {
    const s = "é".repeat(40000);
    expect(notesMarkdownTooLarge(s)).toBe(true);
  });
  test("allows small notes", () => {
    expect(notesMarkdownTooLarge("hello")).toBe(false);
    expect(notesMarkdownTooLarge(null)).toBe(false);
  });
});

describe("plainNotesExcerpt — R-028", () => {
  test("clamps length with ellipsis", () => {
    const s = "x".repeat(300);
    const e = plainNotesExcerpt(s, 280);
    expect(e.length).toBeLessThanOrEqual(281);
    expect(e.endsWith("…")).toBe(true);
  });
});

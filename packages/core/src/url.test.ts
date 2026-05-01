import { describe, expect, test } from "bun:test";
import { validateDestinationUrl } from "./url";

describe("validateDestinationUrl — R-005", () => {
  test("R-005: rejects javascript scheme", () => {
    expect(validateDestinationUrl("javascript:alert(1)").ok).toBe(false);
  });
  test("R-005: rejects data scheme", () => {
    expect(validateDestinationUrl("data:text/html,hi").ok).toBe(false);
  });
  test("R-005: accepts https destination", () => {
    const r = validateDestinationUrl("https://a.example/foo");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.normalized).toContain("https://a.example/");
  });
  test("R-005: accepts http destination", () => {
    expect(validateDestinationUrl("http://b.example/").ok).toBe(true);
  });
});

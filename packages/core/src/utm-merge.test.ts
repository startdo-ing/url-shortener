import { describe, expect, test } from "bun:test";
import { mergeUtmParamsIntoUrl } from "./utm-merge";

describe("mergeUtmParamsIntoUrl — R-035", () => {
  test("adds utm_* to bare URL", () => {
    const out = mergeUtmParamsIntoUrl("https://example.com/path", {
      utm_source: "newsletter",
      utm_medium: "email",
    });
    const u = new URL(out);
    expect(u.searchParams.get("utm_source")).toBe("newsletter");
    expect(u.searchParams.get("utm_medium")).toBe("email");
  });

  test("template overwrites existing utm key", () => {
    const out = mergeUtmParamsIntoUrl("https://x.test/?utm_source=old&keep=1", {
      utm_source: "new",
    });
    const u = new URL(out);
    expect(u.searchParams.get("utm_source")).toBe("new");
    expect(u.searchParams.get("keep")).toBe("1");
  });

  test("ignores empty and null fields", () => {
    const out = mergeUtmParamsIntoUrl("https://a.test/", {
      utm_source: "",
      utm_medium: null,
      utm_campaign: "  ",
    });
    const u = new URL(out);
    expect(u.searchParams.has("utm_source")).toBe(false);
    expect(u.searchParams.has("utm_medium")).toBe(false);
    expect(u.searchParams.has("utm_campaign")).toBe(false);
  });
});

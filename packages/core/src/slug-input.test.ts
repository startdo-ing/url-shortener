import { describe, expect, test } from "bun:test";
import { parseSlugInput } from "./index";

describe("parseSlugInput — R-020 custom slug grammar", () => {
  test("valid slug", () => {
    expect(parseSlugInput("my-link_9")).toBe("my-link_9");
  });
  test("empty → null", () => {
    expect(parseSlugInput("")).toBe(null);
    expect(parseSlugInput("   ")).toBe(null);
  });
  test("reject space", () => {
    expect(parseSlugInput("a b")).toBe(null);
  });
});

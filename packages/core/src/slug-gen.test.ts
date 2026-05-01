import { describe, expect, test } from "bun:test";
import { generateRandomSlug } from "./slug-gen";

describe("generateRandomSlug", () => {
  test("length and charset [A-Za-z0-9]", () => {
    const s = generateRandomSlug(10);
    expect(s.length).toBe(10);
    expect(/^[0-9A-Za-z]+$/.test(s)).toBe(true);
  });
});

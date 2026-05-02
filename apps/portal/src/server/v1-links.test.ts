import { describe, expect, test } from "bun:test";
import { readExpiresFromBody, readTagsFromBody } from "./v1-links";

describe("v1-links helpers", () => {
  test("readTagsFromBody array and string", () => {
    expect(readTagsFromBody({ tags: ["A", "b"] })).toEqual(["a", "b"]);
    expect(readTagsFromBody({ tags: "x, y" })).toEqual(["x", "y"]);
    expect(readTagsFromBody({})).toEqual([]);
  });

  test("readExpiresFromBody", () => {
    expect(readExpiresFromBody({})).toBeNull();
    expect(readExpiresFromBody({ expires_at: "2026-01-15T00:00:00.000Z" })).toBeInstanceOf(Date);
    expect(readExpiresFromBody({ expires_at: "not-a-date" })).toBe("invalid");
  });
});

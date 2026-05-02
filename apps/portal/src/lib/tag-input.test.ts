import { describe, expect, test } from "bun:test";
import { parseTagNamesInput } from "./tag-input";

describe("parseTagNamesInput — R-036", () => {
  test("splits comma list and lowercases", () => {
    expect(parseTagNamesInput("Foo, bar, foo")).toEqual(["foo", "bar"]);
  });

  test("drops invalid tokens", () => {
    expect(parseTagNamesInput("ok-tag, !!!, also_ok")).toEqual(["ok-tag", "also_ok"]);
  });

  test("empty and null", () => {
    expect(parseTagNamesInput("")).toEqual([]);
    expect(parseTagNamesInput(null)).toEqual([]);
  });

  test("caps count", () => {
    const many = Array.from({ length: 30 }, (_, i) => `t${i}`).join(",");
    expect(parseTagNamesInput(many).length).toBe(24);
  });
});

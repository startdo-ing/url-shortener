import { describe, expect, test } from "bun:test";
import {
  parseSingleSlugSegment,
  SLUG_SEGMENT_PATTERN,
  isAllowedSlugSegment,
} from "./index";

describe("SLUG_SEGMENT_PATTERN — R-003", () => {
  test("R-003: alphanumeric and _ - allowed chars", () => {
    expect(SLUG_SEGMENT_PATTERN.test("a")).toBe(true);
    expect(SLUG_SEGMENT_PATTERN.test("Za9_-")).toBe(true);
  });
  test("R-003: empty and too-long rejected", () => {
    expect(SLUG_SEGMENT_PATTERN.test("")).toBe(false);
    expect(isAllowedSlugSegment("a".repeat(129))).toBe(false);
  });
  test("R-003: space and slashes rejected by segment pattern", () => {
    expect(SLUG_SEGMENT_PATTERN.test("bad slug")).toBe(false);
    expect(SLUG_SEGMENT_PATTERN.test("a/b")).toBe(false);
  });
});

describe("parseSingleSlugSegment — R-003", () => {
  test("R-003: multiple path segments ⇒ null", () => {
    expect(parseSingleSlugSegment("/ab/cd")).toBe(null);
    expect(parseSingleSlugSegment("/a/b")).toBe(null);
  });
  test("R-003: root path ⇒ null", () => {
    expect(parseSingleSlugSegment("/")).toBe(null);
  });
  test("R-003: encoded valid slug ⇒ decoded segment", () => {
    expect(parseSingleSlugSegment("/abc")).toBe("abc");
    expect(parseSingleSlugSegment("/Z9_a")).toBe("Z9_a");
    expect(parseSingleSlugSegment("/%61bc")).toBe("abc");
  });
  test("R-003: percent-decoded violates charset ⇒ null", () => {
    expect(parseSingleSlugSegment("/oops%20space")).toBe(null);
  });
});

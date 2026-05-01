import { describe, expect, test } from "bun:test";
import { resolveClientIp } from "./ip";

describe("resolveClientIp", () => {
  test("hops 0 ⇒ direct only", () => {
    expect(resolveClientIp(new Headers({ "x-forwarded-for": "9.9.9.9" }), 0, "1.2.3.4")).toBe("1.2.3.4");
  });
});

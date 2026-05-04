import { describe, expect, test } from "bun:test";
import { validateUskApiKeyBearer } from "./api-keys";

describe("validateUskApiKeyBearer — R-033", () => {
  test("rejects missing header, junk, or malformed prefixes", () => {
    expect(validateUskApiKeyBearer(null)).toBeNull();
    expect(validateUskApiKeyBearer("Basic x")).toBeNull();
    expect(validateUskApiKeyBearer("Bearer usk_xyz")).toBeNull();
    expect(validateUskApiKeyBearer("Bearer usk_badprefix.nosecret")).toBeNull();
  });

  test("accepts Bearer usk_<12hex>.<remainder>", () => {
    const { token, keyPrefix } =
      validateUskApiKeyBearer("Bearer usk_a1b2c3d4e5f6.0123456789abcdef")!;
    expect(token).toBe("usk_a1b2c3d4e5f6.0123456789abcdef");
    expect(keyPrefix).toBe("a1b2c3d4e5f6");
    expect(/^usk_[a-f0-9]{12}\.[a-z0-9]+$/i.test(token)).toBe(true);
  });
});

import { describe, expect, test } from "bun:test";
import {
  generateApiKeyPlaintext,
  parseApiKeyBearer,
  sha256Hex,
  timingSafeEqualHex64,
} from "./api-key-crypto";

describe("api-key-crypto — R-033", () => {
  test("parseApiKeyBearer", () => {
    expect(parseApiKeyBearer("Bearer abc.def")).toBe("abc.def");
    expect(parseApiKeyBearer("bearer x")).toBe("x");
    expect(parseApiKeyBearer(null)).toBeNull();
  });

  test("timingSafeEqualHex64 rejects length mismatch", () => {
    expect(timingSafeEqualHex64("ab", "ab")).toBe(false);
    expect(timingSafeEqualHex64("a".repeat(64), "b".repeat(64))).toBe(false);
  });

  test("generateApiKeyPlaintext round-trip hash", () => {
    const { plaintext, keyHash } = generateApiKeyPlaintext();
    expect(plaintext.startsWith("usk_")).toBe(true);
    expect(sha256Hex(plaintext)).toBe(keyHash);
  });
});

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function sha256Hex(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

/** Constant-time compare of two 64-char hex strings (SHA-256). */
export function timingSafeEqualHex64(a: string, b: string): boolean {
  if (a.length !== 64 || b.length !== 64) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

/** Format `usk_<12hex>.<secret>` — secret is 24 random bytes, base64url. */
export function generateApiKeyPlaintext(): { plaintext: string; keyPrefix: string; keyHash: string } {
  const keyPrefix = randomBytes(6).toString("hex");
  const secret = randomBytes(24).toString("base64url");
  const plaintext = `usk_${keyPrefix}.${secret}`;
  return { plaintext, keyPrefix, keyHash: sha256Hex(plaintext) };
}

export function parseApiKeyBearer(authorization: string | null): string | null {
  if (authorization == null) return null;
  const m = /^\s*Bearer\s+(\S+)\s*$/i.exec(authorization);
  return m?.[1] ?? null;
}

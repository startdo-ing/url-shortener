const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** Cryptographic random slug; default length 8. Charset matches allowed segment subset. */
export function generateRandomSlug(length = 8): string {
  if (length < 1 || length > 128) throw new RangeError("slug length");
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}

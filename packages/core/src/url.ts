export type ValidateDestinationResult =
  | { ok: true; normalized: string }
  | { ok: false; reason: "invalid_destination" };

/** R-005 — only http(s); blocks javascript:, data:, vbscript:, etc. */
export function validateDestinationUrl(raw: string): ValidateDestinationResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: "invalid_destination" };

  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return { ok: false, reason: "invalid_destination" };
  }

  const p = u.protocol.toLowerCase();
  if (p !== "http:" && p !== "https:") {
    return { ok: false, reason: "invalid_destination" };
  }

  return { ok: true, normalized: u.href };
}

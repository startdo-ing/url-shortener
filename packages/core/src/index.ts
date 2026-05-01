/** Matches a single slug path segment after decode (ASCII alnum + `-`/`_`). */
export const SLUG_SEGMENT_PATTERN =
  /^[a-zA-Z0-9_-]{1,128}$/;

export function isAllowedSlugSegment(pathSegment: string): boolean {
  return SLUG_SEGMENT_PATTERN.test(pathSegment);
}

/** True for `/slug` exactly one non-empty decoded segment — not `/`, `/a/b`, `//`. */
export function parseSingleSlugSegment(pathname: string): string | null {
  if (!pathname.startsWith("/")) return null;
  const raw = pathname.slice(1);
  if (raw.length === 0) return null;
  if (raw.includes("/")) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw.replace(/\+/g, "%2B"));
  } catch {
    return null;
  }
  // Reject accidental embedded slash after decode
  if (decoded.includes("/") || decoded.includes("?")) return null;
  if (!isAllowedSlugSegment(decoded)) return null;
  return decoded;
}

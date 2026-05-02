export type { ValidateDestinationResult } from "./url";
export { validateDestinationUrl } from "./url";
export { isSsrfBlockedUrl } from "./ssrf-host";
export type { TargetPreview } from "./unfurl-meta";
export { extractTargetPreviewFromHtml, resolveUrlReference } from "./unfurl-meta";
export { generateRandomSlug } from "./slug-gen";

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

/** Custom slug field from portal (trim, strip leading slashes). Empty → null → caller may generate random. */
export type { UtmTemplateFields } from "./utm-merge";
export { mergeUtmParamsIntoUrl } from "./utm-merge";

export function parseSlugInput(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const stripped = raw.trim().replace(/^\/+/, "");
  if (!stripped) return null;
  return parseSingleSlugSegment(`/${stripped}`);
}

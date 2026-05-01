/**
 * When trustProxyHops <= 0: direct socket IP only.
 * When >= 1: first comma-separated token of X-Forwarded-For if present (see F-001 contract tests).
 */
export function resolveClientIp(
  headers: Headers,
  trustProxyHops: number,
  directIp: string | null,
): string | null {
  if (trustProxyHops <= 0) return directIp;
  const raw = headers.get("x-forwarded-for");
  if (raw == null || raw.trim() === "") return directIp;
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter((p) => p.length > 0);
  if (parts.length === 0) return directIp;
  return parts[0] ?? directIp;
}

/** R-037 — canonical short URL encoded into QR artefacts. */

/** Same contract as Astro `PUBLIC_SHORT_BASE_URL` (portal env). */
export function shortUrlForSlug(publicShortBaseUrl: string | undefined, slug: string): string | null {
  const raw = publicShortBaseUrl;
  if (raw == null || String(raw).trim() === "") return null;
  const base = String(raw).replace(/\/$/, "");
  return `${base}/${encodeURIComponent(slug)}`;
}

export const QR_SVG_THEME = {
  margin: 1,
  color: { dark: "#0F1112", light: "#FFFFFF" },
} as const;

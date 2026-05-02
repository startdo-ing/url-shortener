/** Keys merged into destination query strings (R-035). */
export type UtmTemplateFields = {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
};

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

/**
 * Sets UTM query parameters on `urlString` (http/https). Non-empty template values overwrite existing keys.
 */
export function mergeUtmParamsIntoUrl(urlString: string, p: UtmTemplateFields): string {
  const u = new URL(urlString);
  for (const k of UTM_KEYS) {
    const raw = p[k];
    if (raw == null) continue;
    const v = String(raw).trim();
    if (v === "") continue;
    u.searchParams.set(k, v);
  }
  return u.toString();
}

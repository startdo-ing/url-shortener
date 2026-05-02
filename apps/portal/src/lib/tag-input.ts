/** R-036: comma-separated tag names; stored lowercase `a-z0-9._-`. */
export function parseTagNamesInput(raw: string | null | undefined): string[] {
  if (raw == null || raw.trim() === "") return [];
  const parts = raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  const re = /^[a-z0-9]([a-z0-9._-]{0,62})$/;
  for (const p of parts) {
    if (seen.has(p)) continue;
    if (out.length >= 24) break;
    if (!re.test(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}

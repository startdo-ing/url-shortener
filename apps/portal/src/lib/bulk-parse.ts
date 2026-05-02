import { parseSlugInput, validateDestinationUrl } from "@url-shortener/core";

export type ParsedBulkLine = {
  /** 1-based line index in the original paste (split by `\n`, including blank lines). */
  lineNumber: number;
  raw: string;
  destination_url: string | null;
  slugField: string | null;
  /** Set when the row cannot be imported as-is. */
  error: string | null;
};

function splitUrlAndSlug(line: string): { url: string; slugExtra: string | null } {
  const t = line.indexOf("\t");
  if (t !== -1) {
    return { url: line.slice(0, t).trim(), slugExtra: line.slice(t + 1).trim() || null };
  }
  const c = line.indexOf(",");
  if (c !== -1) {
    return { url: line.slice(0, c).trim(), slugExtra: line.slice(c + 1).trim() || null };
  }
  return { url: line.trim(), slugExtra: null };
}

/** R-029 — newline-separated URLs; optional 2nd column slug after TAB or first comma. */
export function parseBulkPaste(text: string): ParsedBulkLine[] {
  const lines = text.split(/\r?\n/);
  const out: ParsedBulkLine[] = [];
  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const raw = lines[i] ?? "";
    if (raw.trim() === "") {
      out.push({
        lineNumber,
        raw,
        destination_url: null,
        slugField: null,
        error: null,
      });
      continue;
    }
    const { url, slugExtra } = splitUrlAndSlug(raw);
    if (!url) {
      out.push({
        lineNumber,
        raw,
        destination_url: null,
        slugField: slugExtra,
        error: "empty URL",
      });
      continue;
    }
    const dest = validateDestinationUrl(url);
    if (!dest.ok) {
      out.push({
        lineNumber,
        raw,
        destination_url: null,
        slugField: slugExtra,
        error: "invalid destination (http/https only)",
      });
      continue;
    }
    if (slugExtra != null && slugExtra !== "") {
      const slug = parseSlugInput(slugExtra);
      if (slug == null) {
        out.push({
          lineNumber,
          raw,
          destination_url: dest.normalized,
          slugField: slugExtra,
          error: "invalid slug (1–128 alnum, hyphen, underscore)",
        });
        continue;
      }
    }
    out.push({
      lineNumber,
      raw,
      destination_url: dest.normalized,
      slugField: slugExtra && slugExtra !== "" ? slugExtra : null,
      error: null,
    });
  }
  return out;
}

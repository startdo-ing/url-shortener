/**
 * Pure HTML → `target_preview` scalars (ADR-0002 truncation). No network.
 */

export type TargetPreview = {
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
};

const MAX_TITLE = 500;
const MAX_DESC = 1000;
const MAX_IMG = 2048;
const MAX_SITE = 120;

function trunc(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max);
}

function decodeBasicEntities(s: string): string {
  return s
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/gi, " ");
}

/** Resolve relative / protocol-relative against page URL. */
export function resolveUrlReference(pageUrl: string, raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const u = new URL(t, pageUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (u.href.length > MAX_IMG) return null;
    return u.href;
  } catch {
    return null;
  }
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function metaContent(attrs: string): string | null {
  const m =
    attrs.match(/\bcontent\s*=\s*"([^"]*)"/i) ??
    attrs.match(/\bcontent\s*=\s*'([^']*)'/i) ??
    attrs.match(/\bcontent\s*=\s*([^\s>]+)/i);
  return m ? decodeBasicEntities(m[1].trim()) : null;
}

function collectMeta(html: string): Map<string, string> {
  const map = new Map<string, string>();
  const re = /<meta\s+([^>]+)>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const attrs = m[1];
    const prop =
      attrs.match(/\bproperty\s*=\s*"([^"]+)"/i)?.[1] ??
      attrs.match(/\bproperty\s*=\s*'([^']+)'/i)?.[1];
    const name =
      attrs.match(/\bname\s*=\s*"([^"]+)"/i)?.[1] ?? attrs.match(/\bname\s*=\s*'([^']+)'/i)?.[1];
    const key = (prop ?? name)?.toLowerCase();
    if (!key) continue;
    const content = metaContent(attrs);
    if (content != null && content !== "") map.set(key, content);
  }
  return map;
}

function pickTitle(html: string, meta: Map<string, string>): string | null {
  const og = meta.get("og:title");
  if (og) return trunc(stripTags(og), MAX_TITLE);
  const tw = meta.get("twitter:title");
  if (tw) return trunc(stripTags(tw), MAX_TITLE);
  const tm = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (tm) {
    const inner = decodeBasicEntities(tm[1].replace(/\s+/g, " ").trim());
    return trunc(inner, MAX_TITLE);
  }
  return null;
}

function pickDescription(html: string, meta: Map<string, string>): string | null {
  const og = meta.get("og:description");
  if (og) return trunc(stripTags(og), MAX_DESC);
  const tw = meta.get("twitter:description");
  if (tw) return trunc(stripTags(tw), MAX_DESC);
  const desc = meta.get("description");
  if (desc) return trunc(stripTags(desc), MAX_DESC);
  return null;
}

function pickImage(pageUrl: string, meta: Map<string, string>): string | null {
  const raw =
    meta.get("og:image") ?? meta.get("twitter:image") ?? meta.get("twitter:image:src") ?? null;
  if (!raw) return null;
  const abs = resolveUrlReference(pageUrl, raw);
  return abs ? trunc(abs, MAX_IMG) : null;
}

function pickSiteName(pageUrl: string, meta: Map<string, string>): string | null {
  const og = meta.get("og:site_name");
  if (og) return trunc(stripTags(og), MAX_SITE);
  try {
    return trunc(new URL(pageUrl).hostname, MAX_SITE);
  } catch {
    return null;
  }
}

export function extractTargetPreviewFromHtml(
  html: string,
  pageUrl: string,
): { preview: TargetPreview; documentTitle: string | null } {
  const meta = collectMeta(html);
  const title = pickTitle(html, meta);
  const description = pickDescription(html, meta);
  const imageUrl = pickImage(pageUrl, meta);
  const siteName = pickSiteName(pageUrl, meta);

  const preview: TargetPreview = {};
  if (title) preview.title = title;
  if (description) preview.description = description;
  if (imageUrl) preview.imageUrl = imageUrl;
  if (siteName) preview.siteName = siteName;

  return { preview, documentTitle: title };
}

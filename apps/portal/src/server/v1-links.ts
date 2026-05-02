import type { LinkRow } from "./db";
import { parseTagNamesInput } from "../lib/tag-input";

export function parseExpiresAtJson(raw: unknown): Date | null | "invalid" {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string") return "invalid";
  const s = raw.trim();
  if (s === "") return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "invalid";
  return d;
}

export function linkToJson(row: LinkRow, tags: string[] = []) {
  return {
    id: row.id,
    slug: row.slug,
    destination_url: row.destination_url,
    display_title: row.display_title,
    target_preview: row.target_preview,
    preview_fetched_at: row.preview_fetched_at?.toISOString() ?? null,
    redirect_type: row.redirect_type,
    status: row.status,
    expires_at: row.expires_at?.toISOString() ?? null,
    notes_markdown: row.notes_markdown,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    tags,
  };
}

export function readTagsFromBody(body: Record<string, unknown>): string[] {
  const t = body.tags;
  if (t == null) return [];
  if (Array.isArray(t)) {
    const parts = t.map((x) => String(x)).join(",");
    return parseTagNamesInput(parts);
  }
  if (typeof t === "string") return parseTagNamesInput(t);
  return [];
}

export function readExpiresFromBody(body: Record<string, unknown>): Date | null | "invalid" {
  const raw = body.expires_at;
  if (raw === undefined) return null;
  const j = parseExpiresAtJson(raw);
  if (j === "invalid") return "invalid";
  return j;
}

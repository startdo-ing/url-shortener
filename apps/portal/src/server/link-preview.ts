import { extractTargetPreviewFromHtml } from "@url-shortener/core";
import type { Sql } from "./db";
import { getSql } from "./db";
import { unfurlDestination } from "./unfurl-fetch";

export type ApplyLinkPreviewFetchDeps = {
  unfurl?: typeof unfurlDestination;
  /** Test hook — defaults to `getSql()`. */
  getSql?: () => Sql;
};

/** R-026 — operator-triggered preview refresh (**R-024**) updates `preview_fetched_at` (+ payload when OK). */
export async function applyLinkPreviewFetch(
  id: string,
  fetchFn: typeof fetch,
  deps: ApplyLinkPreviewFetchDeps = {},
): Promise<{ ok: true; unfurlOk: boolean } | { ok: false; reason: "not_found" }> {
  const unfurlFn = deps.unfurl ?? unfurlDestination;
  const sql = deps.getSql?.() ?? getSql();
  const rows = await sql<
    {
      id: string;
      destination_url: string;
      display_title: string | null;
    }[]
  >`
    SELECT id, destination_url, display_title FROM links WHERE id = ${id}::uuid LIMIT 1
  `;
  const row = rows[0];
  if (!row) return { ok: false, reason: "not_found" };

  const now = new Date();
  const r = await unfurlFn(row.destination_url, fetchFn);

  if (!r.ok) {
    await sql`
      UPDATE links SET
        target_preview = NULL,
        preview_fetched_at = ${now},
        updated_at = now()
      WHERE id = ${id}::uuid
    `;
    return { ok: true, unfurlOk: false };
  }

  const { preview } = extractTargetPreviewFromHtml(r.html, r.finalUrl);
  const hasKeys = Object.keys(preview).length > 0;
  const json = hasKeys ? preview : null;
  const t = preview.title;
  const nextTitle =
    typeof t === "string" && t.trim() !== "" ? t.trim() : row.display_title;

  await sql`
    UPDATE links SET
      target_preview = ${json === null ? null : sql.json(json)},
      preview_fetched_at = ${now},
      display_title = ${nextTitle},
      updated_at = now()
    WHERE id = ${id}::uuid
  `;
  return { ok: true, unfurlOk: true };
}

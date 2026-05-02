import type { APIRoute } from "astro";
import { parseBulkPaste } from "../../lib/bulk-parse";
import { commitBulkImport, errorsToTsv, previewBulkImport } from "../../server/bulk-import";
import { getSql } from "../../server/db";

export const prerender = false;

const MAX_ERR_B64_QUERY = 1800;

function compactErrorsForQuery(errors: { line: number; message: string }[]): string | null {
  let e = [...errors];
  let tsv = errorsToTsv(e);
  while (e.length > 0 && Buffer.byteLength(tsv, "utf8") > 2400) {
    e = e.slice(0, Math.max(0, e.length - 1));
    tsv = errorsToTsv(e);
  }
  const b64 = Buffer.from(tsv, "utf8").toString("base64url");
  if (b64.length <= MAX_ERR_B64_QUERY) return b64;
  return Buffer.from(errorsToTsv(errors.slice(0, 3)), "utf8").toString("base64url");
}

export const POST: APIRoute = async ({ request, redirect }) => {
  const url = new URL(request.url);
  const form = await request.formData();
  const csv = String(form.get("csv") ?? "");
  const mode = String(form.get("mode") ?? "");
  const dry = url.searchParams.get("dry_run") === "1" || mode === "preview";

  const lines = parseBulkPaste(csv);
  const sql = getSql();

  if (dry) {
    const p = await previewBulkImport(sql, lines);
    const q = new URLSearchParams({
      dry: "1",
      new: String(p.wouldCreate),
      dup: String(p.wouldSkipDuplicate),
      bad: String(p.wouldFail),
    });
    const b64 = compactErrorsForQuery(p.errorsForTsv);
    if (b64) q.set("errs", b64);
    return redirect(`/links/bulk?${q.toString()}`, 303);
  }

  const r = await commitBulkImport(lines);
  const q = new URLSearchParams({
    created: String(r.created),
    skipped: String(r.skipped),
    failed: String(r.failed),
  });
  const b64 = compactErrorsForQuery(r.errorsForTsv);
  if (b64) q.set("errs", b64);
  return redirect(`/links/bulk?${q.toString()}`, 303);
};

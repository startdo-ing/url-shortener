import { parseSlugInput } from "@url-shortener/core";
import type { ParsedBulkLine } from "../lib/bulk-parse";
import { createLink } from "./mutations";
import type { Sql } from "./db";

export type BulkCommitResult = {
  created: number;
  skipped: number;
  failed: number;
  errorsForTsv: { line: number; message: string }[];
};

export type BulkPreviewResult = {
  wouldCreate: number;
  wouldSkipDuplicate: number;
  wouldFail: number;
  errorsForTsv: { line: number; message: string }[];
};

function pushErr(
  errors: { line: number; message: string }[],
  line: number,
  msg: string,
): void {
  errors.push({ line, message: msg });
}

/** Dry-run: validation + duplicate slug detection for explicit slugs (R-029). */
export async function previewBulkImport(sql: Sql, lines: ParsedBulkLine[]): Promise<BulkPreviewResult> {
  let wouldCreate = 0;
  let wouldSkipDuplicate = 0;
  let wouldFail = 0;
  const errorsForTsv: { line: number; message: string }[] = [];

  for (const line of lines) {
    if (line.raw.trim() === "") continue;
    if (line.error) {
      wouldFail++;
      pushErr(errorsForTsv, line.lineNumber, line.error);
      continue;
    }
    if (!line.destination_url) {
      wouldFail++;
      pushErr(errorsForTsv, line.lineNumber, "invalid row");
      continue;
    }
    const rawSlug = (line.slugField ?? "").trim();
    if (rawSlug !== "") {
      const slug = parseSlugInput(line.slugField!)!;
      const ex = await sql<{ x: number }[]>`
        SELECT 1 AS x FROM links WHERE slug = ${slug} LIMIT 1
      `;
      if (ex.length > 0) wouldSkipDuplicate++;
      else wouldCreate++;
    } else {
      wouldCreate++;
    }
  }

  return { wouldCreate, wouldSkipDuplicate, wouldFail, errorsForTsv };
}

/** Commits rows via `createLink` (no single DB transaction — partial success possible). */
export async function commitBulkImport(lines: ParsedBulkLine[]): Promise<BulkCommitResult> {
  let created = 0;
  let skipped = 0;
  let failed = 0;
  const errorsForTsv: { line: number; message: string }[] = [];

  for (const line of lines) {
    if (line.raw.trim() === "") continue;
    if (line.error || !line.destination_url) {
      failed++;
      if (line.error) pushErr(errorsForTsv, line.lineNumber, line.error);
      else pushErr(errorsForTsv, line.lineNumber, "invalid row");
      continue;
    }
    const r = await createLink({
      destination_url: line.destination_url,
      slugField: line.slugField?.trim() ? line.slugField : null,
      redirect_type: 302,
      status: "active",
      display_title: null,
      notes_markdown: null,
      expires_at: null,
    });
    if (r.ok) created++;
    else if (r.code === "duplicate_slug") {
      skipped++;
    } else {
      failed++;
      pushErr(errorsForTsv, line.lineNumber, r.code);
    }
  }

  return { created, skipped, failed, errorsForTsv };
}

export function errorsToTsv(errors: { line: number; message: string }[]): string {
  return ["line\tmessage", ...errors.map((e) => `${e.line}\t${e.message.replace(/\t/g, " ")}`)].join("\n");
}

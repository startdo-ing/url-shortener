/** R-030 — pure CSV/JSON export formatting from query rows (routes stay thin). */

export type ExportLinkRow = {
  slug: string;
  destination_url: string;
  status: string;
  redirect_type: number;
  created_at: Date;
  updated_at: Date;
  click_count: number;
};

export function escapeCsvCell(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportLinksToCsv(rows: ExportLinkRow[]): string {
  const header = ["slug", "destination_url", "status", "redirect_type", "created_at", "updated_at", "click_count"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        escapeCsvCell(r.slug),
        escapeCsvCell(r.destination_url),
        escapeCsvCell(r.status),
        String(r.redirect_type),
        escapeCsvCell(r.created_at.toISOString()),
        escapeCsvCell(r.updated_at.toISOString()),
        String(r.click_count),
      ].join(","),
    ),
  ];
  return lines.join("\n") + "\n";
}

export function exportLinksToJson(rows: ExportLinkRow[]): string {
  const payload = rows.map((r) => ({
    slug: r.slug,
    destination_url: r.destination_url,
    status: r.status,
    redirect_type: r.redirect_type,
    created_at: r.created_at.toISOString(),
    updated_at: r.updated_at.toISOString(),
    click_count: r.click_count,
  }));
  return JSON.stringify(payload, null, 2);
}

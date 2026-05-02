import type { APIRoute } from "astro";
import { getSql } from "../../server/db";

export const prerender = false;

function esc(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export const GET: APIRoute = async () => {
  const sql = getSql();
  const rows = await sql<
    {
      slug: string;
      destination_url: string;
      status: string;
      redirect_type: number;
      created_at: Date;
      updated_at: Date;
      click_count: number;
    }[]
  >`
    SELECT l.slug, l.destination_url, l.status, l.redirect_type,
           l.created_at, l.updated_at,
           coalesce(c.n, 0)::int AS click_count
    FROM links l
    LEFT JOIN (
      SELECT link_id, count(*)::bigint AS n FROM click_events GROUP BY link_id
    ) c ON c.link_id = l.id
    ORDER BY l.created_at DESC
  `;

  const header = ["slug", "destination_url", "status", "redirect_type", "created_at", "updated_at", "click_count"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        esc(r.slug),
        esc(r.destination_url),
        esc(r.status),
        String(r.redirect_type),
        esc(r.created_at.toISOString()),
        esc(r.updated_at.toISOString()),
        String(r.click_count),
      ].join(","),
    ),
  ];
  const body = lines.join("\n") + "\n";

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="links.csv"',
    },
  });
};

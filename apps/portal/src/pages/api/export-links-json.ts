import type { APIRoute } from "astro";
import { exportLinksToJson, type ExportLinkRow } from "../../server/export-format";
import { getSql } from "../../server/db";

export const prerender = false;

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

  const body = exportLinksToJson(rows as ExportLinkRow[]);

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="links.json"',
    },
  });
};

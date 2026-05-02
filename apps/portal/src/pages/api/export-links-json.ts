import type { APIRoute } from "astro";
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

  const payload = rows.map((r) => ({
    slug: r.slug,
    destination_url: r.destination_url,
    status: r.status,
    redirect_type: r.redirect_type,
    created_at: r.created_at.toISOString(),
    updated_at: r.updated_at.toISOString(),
    click_count: r.click_count,
  }));

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="links.json"',
    },
  });
};

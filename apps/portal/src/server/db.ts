import postgres from "postgres";

let _sql: ReturnType<typeof postgres> | null = null;

export type Sql = ReturnType<typeof postgres>;

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for the portal server");
  _sql ??= postgres(url, { max: 10, idle_timeout: 20 });
  return _sql;
}

export type LinkRow = {
  id: string;
  slug: string;
  destination_url: string;
  display_title: string | null;
  target_preview: Record<string, unknown> | null;
  preview_fetched_at: Date | null;
  redirect_type: number;
  status: string;
  expires_at: Date | null;
  notes_markdown: string | null;
  created_at: Date;
  updated_at: Date;
};

export async function listLinks(search?: string | null): Promise<LinkRow[]> {
  const sql = getSql();
  const q = search?.trim();
  if (!q) {
    return await sql<LinkRow[]>`
      SELECT id, slug, destination_url, display_title, target_preview, preview_fetched_at,
             redirect_type, status, expires_at, notes_markdown, created_at, updated_at
      FROM links
      ORDER BY created_at DESC
    `;
  }
  const needle = q.toLowerCase();
  return await sql<LinkRow[]>`
    SELECT DISTINCT l.id, l.slug, l.destination_url, l.display_title, l.target_preview, l.preview_fetched_at,
           l.redirect_type, l.status, l.expires_at, l.notes_markdown, l.created_at, l.updated_at
    FROM links l
    LEFT JOIN link_tags lt ON lt.link_id = l.id
    LEFT JOIN tags t ON t.id = lt.tag_id
    WHERE position(${needle} in lower(l.slug)) > 0
       OR position(${needle} in lower(l.destination_url)) > 0
       OR position(${needle} in lower(t.name)) > 0
    ORDER BY l.created_at DESC
  `;
}

export async function getLinkById(id: string): Promise<LinkRow | undefined> {
  const sql = getSql();
  const rows = await sql<LinkRow[]>`
    SELECT id, slug, destination_url, display_title, target_preview, preview_fetched_at,
           redirect_type, status, expires_at, notes_markdown, created_at, updated_at
    FROM links WHERE id = ${id}::uuid LIMIT 1
  `;
  return rows[0];
}

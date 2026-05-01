import postgres from "postgres";

let _sql: ReturnType<typeof postgres> | null = null;

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
  redirect_type: number;
  status: string;
  expires_at: Date | null;
  notes_markdown: string | null;
  created_at: Date;
  updated_at: Date;
};

export async function listLinks(): Promise<LinkRow[]> {
  const sql = getSql();
  return await sql<LinkRow[]>`
    SELECT id, slug, destination_url, display_title, redirect_type, status,
           expires_at, notes_markdown, created_at, updated_at
    FROM links
    ORDER BY created_at DESC
  `;
}

export async function getLinkById(id: string): Promise<LinkRow | undefined> {
  const sql = getSql();
  const rows = await sql<LinkRow[]>`
    SELECT id, slug, destination_url, display_title, redirect_type, status,
           expires_at, notes_markdown, created_at, updated_at
    FROM links WHERE id = ${id}::uuid LIMIT 1
  `;
  return rows[0];
}

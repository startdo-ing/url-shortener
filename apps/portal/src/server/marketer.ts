import { getSql } from "./db";

export type UtmTemplateRow = {
  id: string;
  name: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  created_at: Date;
};

export async function listUtmTemplates(): Promise<UtmTemplateRow[]> {
  const sql = getSql();
  return await sql<UtmTemplateRow[]>`
    SELECT id, name, utm_source, utm_medium, utm_campaign, utm_term, utm_content, created_at
    FROM utm_templates
    ORDER BY lower(name)
  `;
}

export async function getUtmTemplateById(id: string): Promise<UtmTemplateRow | undefined> {
  const sql = getSql();
  const rows = await sql<UtmTemplateRow[]>`
    SELECT id, name, utm_source, utm_medium, utm_campaign, utm_term, utm_content, created_at
    FROM utm_templates
    WHERE id = ${id}::uuid
    LIMIT 1
  `;
  return rows[0];
}

export async function createUtmTemplate(input: {
  name: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
}): Promise<"ok" | "duplicate" | "invalid"> {
  const name = input.name.trim();
  if (name.length === 0 || name.length > 128) return "invalid";
  const sql = getSql();
  const trim = (s: string | null) => (s?.trim() ? s.trim() : null);
  try {
    await sql`
      INSERT INTO utm_templates (id, name, utm_source, utm_medium, utm_campaign, utm_term, utm_content)
      VALUES (
        ${crypto.randomUUID()}::uuid,
        ${name},
        ${trim(input.utm_source)},
        ${trim(input.utm_medium)},
        ${trim(input.utm_campaign)},
        ${trim(input.utm_term)},
        ${trim(input.utm_content)}
      )
    `;
    return "ok";
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "23505") {
      return "duplicate";
    }
    throw e;
  }
}

export async function deleteUtmTemplateById(id: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    DELETE FROM utm_templates WHERE id = ${id}::uuid RETURNING id
  `;
  return rows.length > 0;
}

export async function getTagsForLinkIds(linkIds: string[]): Promise<Map<string, string[]>> {
  const m = new Map<string, string[]>();
  if (linkIds.length === 0) return m;
  const sql = getSql();
  const rows = await sql<{ link_id: string; name: string }[]>`
    SELECT lt.link_id, t.name
    FROM link_tags lt
    JOIN tags t ON t.id = lt.tag_id
    WHERE lt.link_id = ANY(${linkIds}::uuid[])
    ORDER BY t.name
  `;
  for (const r of rows) {
    const arr = m.get(r.link_id) ?? [];
    arr.push(r.name);
    m.set(r.link_id, arr);
  }
  return m;
}

export async function setLinkTags(linkId: string, names: string[]): Promise<void> {
  const sql = getSql();
  await sql.begin(async (tx) => {
    await tx`DELETE FROM link_tags WHERE link_id = ${linkId}::uuid`;
    for (const name of names) {
      await tx`
        INSERT INTO tags (id, name) VALUES (${crypto.randomUUID()}::uuid, ${name})
        ON CONFLICT (name) DO NOTHING
      `;
      const rows = await tx<{ id: string }[]>`
        SELECT id FROM tags WHERE name = ${name} LIMIT 1
      `;
      const tagId = rows[0]?.id;
      if (!tagId) continue;
      await tx`
        INSERT INTO link_tags (link_id, tag_id) VALUES (${linkId}::uuid, ${tagId}::uuid)
      `;
    }
  });
}

export type TagListRow = { id: string; name: string; link_count: number };

export async function listTagsWithCounts(): Promise<TagListRow[]> {
  const sql = getSql();
  return await sql<TagListRow[]>`
    SELECT t.id, t.name, count(lt.link_id)::int AS link_count
    FROM tags t
    LEFT JOIN link_tags lt ON lt.tag_id = t.id
    GROUP BY t.id, t.name
    ORDER BY t.name
  `;
}

export async function deleteTagById(id: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    DELETE FROM tags WHERE id = ${id}::uuid RETURNING id
  `;
  return rows.length > 0;
}

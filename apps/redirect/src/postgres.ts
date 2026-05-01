import postgres from "postgres";
import type { ClickInsert, LinkRow, RedirectDeps } from "./types";

export function createPostgresDeps(
  sql: ReturnType<typeof postgres>,
  trustProxyHops: number,
  nowImpl: () => Date = () => new Date(),
): RedirectDeps {
  return {
    trustProxyHops,
    now: nowImpl,
    async findLinkBySlug(slug: string): Promise<LinkRow | null> {
      const rows = await sql<
        {
          id: string;
          slug: string;
          destination_url: string;
          redirect_type: number;
          status: string;
          expires_at: Date | null;
        }[]
      >`
        SELECT id, slug, destination_url, redirect_type, status, expires_at
        FROM links
        WHERE slug = ${slug}
        LIMIT 1
      `;
      const r = rows[0];
      if (!r) return null;
      return {
        id: r.id,
        slug: r.slug,
        destination_url: r.destination_url,
        redirect_type: r.redirect_type === 301 ? 301 : 302,
        status: r.status as "active" | "paused",
        expires_at: r.expires_at,
      };
    },
    async insertClick(p: ClickInsert): Promise<void> {
      await sql`
        INSERT INTO click_events (link_id, ip, referrer, user_agent, accept_language)
        VALUES (
          ${p.linkId}::uuid,
          ${p.ip as string | null},
          ${p.referrer},
          ${p.userAgent},
          ${p.acceptLanguage}
        )
      `;
    },
  };
}

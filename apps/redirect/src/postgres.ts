import postgres from "postgres";
import { geoFieldsForIp, rawHeadersFromRequest, uaEnrichmentFields } from "./enrich-click";
import { getCityReader } from "./geo-reader";
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
    async insertClick(p: ClickInsert): Promise<number> {
      const rows = await sql<{ id: string }[]>`
        INSERT INTO click_events (link_id, ip, referrer, user_agent, accept_language)
        VALUES (
          ${p.linkId}::uuid,
          ${p.ip as string | null},
          ${p.referrer},
          ${p.userAgent},
          ${p.acceptLanguage}
        )
        RETURNING id
      `;
      return Number(rows[0]!.id);
    },
    async enrichClick(clickId: number, requestHeaders: Headers): Promise<void> {
      const rows = await sql<{ user_agent: string | null; ip: string | null }[]>`
        SELECT user_agent, ip::text AS ip FROM click_events WHERE id = ${clickId} LIMIT 1
      `;
      const row = rows[0];
      if (!row) return;

      const ua = uaEnrichmentFields(row.user_agent);
      const reader = await getCityReader();
      const geo = await geoFieldsForIp(row.ip, reader);
      const raw = rawHeadersFromRequest(requestHeaders);

      await sql`
        UPDATE click_events SET
          browser = ${ua.browser},
          os = ${ua.os},
          device_type = ${ua.device_type},
          is_bot = ${ua.is_bot},
          country_code = ${geo?.country_code ?? null},
          region = ${geo?.region ?? null},
          city = ${geo?.city ?? null},
          latitude = ${geo?.latitude ?? null},
          longitude = ${geo?.longitude ?? null},
          raw_headers = ${raw === null ? null : sql.json(raw)}
        WHERE id = ${clickId}
      `;
    },
  };
}

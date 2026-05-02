import type { Sql } from "./db";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_ANALYTICS_RANGE_DAYS = 400;

export type AnalyticsRange = {
  from: string;
  to: string;
  /** `true` ⇒ `human=1` (**R-011**) — only non-bot clicks. */
  humanOnly: boolean;
};

export type AnalyticsRangeError = "bad_from" | "bad_to" | "from_after_to" | "range_too_long";

export function parseAnalyticsSearchParams(
  sp: URLSearchParams,
  todayUtc: Date = new Date(),
): { ok: true; range: AnalyticsRange } | { ok: false; error: AnalyticsRangeError } {
  const fromRaw = sp.get("from")?.trim() ?? "";
  const toRaw = sp.get("to")?.trim() ?? "";
  const humanRaw = sp.get("human")?.trim() ?? "";

  const pad = (d: Date) => d.toISOString().slice(0, 10);
  const t0 = new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), todayUtc.getUTCDate()));
  const defaultTo = pad(t0);
  const defaultFromD = new Date(t0);
  defaultFromD.setUTCDate(defaultFromD.getUTCDate() - 13);
  const defaultFrom = pad(defaultFromD);

  const from = fromRaw === "" ? defaultFrom : fromRaw;
  const to = toRaw === "" ? defaultTo : toRaw;

  if (!DATE_RE.test(from)) return { ok: false, error: "bad_from" };
  if (!DATE_RE.test(to)) return { ok: false, error: "bad_to" };
  if (from > to) return { ok: false, error: "from_after_to" };

  const fd = new Date(`${from}T00:00:00.000Z`);
  const td = new Date(`${to}T00:00:00.000Z`);
  const days = (td.getTime() - fd.getTime()) / (86400 * 1000) + 1;
  if (days > MAX_ANALYTICS_RANGE_DAYS) return { ok: false, error: "range_too_long" };

  const humanOnly = humanRaw === "1" || humanRaw.toLowerCase() === "true";

  return { ok: true, range: { from, to, humanOnly } };
}

export type CountryRow = { country_code: string; clicks: number };

/** R-010 — stable map-shaped JSON for tests / optional `data-*` hooks. */
export function countryRollupToMap(rows: CountryRow[]): Record<string, number> {
  const o: Record<string, number> = {};
  for (const r of rows) o[r.country_code] = r.clicks;
  return o;
}
export type DimRow = { label: string; clicks: number };
export type DayRow = { day: string; clicks: number };

export type AnalyticsBundle = {
  totalClicks: number;
  byCountry: CountryRow[];
  byDevice: DimRow[];
  byBrowser: DimRow[];
  byDay: DayRow[];
};

function hf(sql: Sql, humanOnly: boolean) {
  return humanOnly ? sql`AND e.is_bot = false` : sql``;
}

export async function getGlobalAnalytics(
  sql: Sql,
  range: AnalyticsRange,
): Promise<AnalyticsBundle> {
  const { from, to, humanOnly } = range;
  const h = hf(sql, humanOnly);

  const totalRows = await sql<{ c: string }[]>`
    SELECT count(*)::text AS c
    FROM click_events e
    WHERE (e.occurred_at AT TIME ZONE 'UTC')::date >= ${from}::date
      AND (e.occurred_at AT TIME ZONE 'UTC')::date <= ${to}::date
      ${h}
  `;
  const totalClicks = Number(totalRows[0]?.c ?? 0);

  const byCountry = await sql<CountryRow[]>`
    SELECT coalesce(nullif(trim(both from e.country_code::text), ''), '??') AS country_code, count(*)::int AS clicks
    FROM click_events e
    WHERE (e.occurred_at AT TIME ZONE 'UTC')::date >= ${from}::date
      AND (e.occurred_at AT TIME ZONE 'UTC')::date <= ${to}::date
      ${h}
    GROUP BY 1
    ORDER BY clicks DESC, country_code ASC
  `;

  const byDevice = await sql<DimRow[]>`
    SELECT coalesce(e.device_type, 'unknown') AS label, count(*)::int AS clicks
    FROM click_events e
    WHERE (e.occurred_at AT TIME ZONE 'UTC')::date >= ${from}::date
      AND (e.occurred_at AT TIME ZONE 'UTC')::date <= ${to}::date
      ${h}
    GROUP BY 1
    ORDER BY clicks DESC, label ASC
  `;

  const byBrowser = await sql<DimRow[]>`
    SELECT coalesce(e.browser, '(unknown)') AS label, count(*)::int AS clicks
    FROM click_events e
    WHERE (e.occurred_at AT TIME ZONE 'UTC')::date >= ${from}::date
      AND (e.occurred_at AT TIME ZONE 'UTC')::date <= ${to}::date
      ${h}
      AND e.browser IS NOT NULL
    GROUP BY 1
    ORDER BY clicks DESC
    LIMIT 15
  `;

  const byDay = await sql<DayRow[]>`
    SELECT (date_trunc('day', e.occurred_at AT TIME ZONE 'UTC'))::date::text AS day, count(*)::int AS clicks
    FROM click_events e
    WHERE (e.occurred_at AT TIME ZONE 'UTC')::date >= ${from}::date
      AND (e.occurred_at AT TIME ZONE 'UTC')::date <= ${to}::date
      ${h}
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  return { totalClicks, byCountry, byDevice, byBrowser, byDay };
}

export async function getSlugAnalytics(
  sql: Sql,
  slug: string,
  range: AnalyticsRange,
): Promise<AnalyticsBundle | "unknown_slug"> {
  const linkRows = await sql<{ id: string }[]>`
    SELECT id FROM links WHERE slug = ${slug} LIMIT 1
  `;
  if (linkRows.length === 0) return "unknown_slug";

  const { from, to, humanOnly } = range;
  const h = hf(sql, humanOnly);

  const totalRows = await sql<{ c: string }[]>`
    SELECT count(*)::text AS c
    FROM click_events e
    JOIN links l ON l.id = e.link_id
    WHERE l.slug = ${slug}
      AND (e.occurred_at AT TIME ZONE 'UTC')::date >= ${from}::date
      AND (e.occurred_at AT TIME ZONE 'UTC')::date <= ${to}::date
      ${h}
  `;
  const totalClicks = Number(totalRows[0]?.c ?? 0);

  const byCountry = await sql<CountryRow[]>`
    SELECT coalesce(nullif(trim(both from e.country_code::text), ''), '??') AS country_code, count(*)::int AS clicks
    FROM click_events e
    JOIN links l ON l.id = e.link_id
    WHERE l.slug = ${slug}
      AND (e.occurred_at AT TIME ZONE 'UTC')::date >= ${from}::date
      AND (e.occurred_at AT TIME ZONE 'UTC')::date <= ${to}::date
      ${h}
    GROUP BY 1
    ORDER BY clicks DESC, country_code ASC
  `;

  const byDevice = await sql<DimRow[]>`
    SELECT coalesce(e.device_type, 'unknown') AS label, count(*)::int AS clicks
    FROM click_events e
    JOIN links l ON l.id = e.link_id
    WHERE l.slug = ${slug}
      AND (e.occurred_at AT TIME ZONE 'UTC')::date >= ${from}::date
      AND (e.occurred_at AT TIME ZONE 'UTC')::date <= ${to}::date
      ${h}
    GROUP BY 1
    ORDER BY clicks DESC, label ASC
  `;

  const byBrowser = await sql<DimRow[]>`
    SELECT coalesce(e.browser, '(unknown)') AS label, count(*)::int AS clicks
    FROM click_events e
    JOIN links l ON l.id = e.link_id
    WHERE l.slug = ${slug}
      AND (e.occurred_at AT TIME ZONE 'UTC')::date >= ${from}::date
      AND (e.occurred_at AT TIME ZONE 'UTC')::date <= ${to}::date
      ${h}
      AND e.browser IS NOT NULL
    GROUP BY 1
    ORDER BY clicks DESC
    LIMIT 15
  `;

  const byDay = await sql<DayRow[]>`
    SELECT (date_trunc('day', e.occurred_at AT TIME ZONE 'UTC'))::date::text AS day, count(*)::int AS clicks
    FROM click_events e
    JOIN links l ON l.id = e.link_id
    WHERE l.slug = ${slug}
      AND (e.occurred_at AT TIME ZONE 'UTC')::date >= ${from}::date
      AND (e.occurred_at AT TIME ZONE 'UTC')::date <= ${to}::date
      ${h}
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  return { totalClicks, byCountry, byDevice, byBrowser, byDay };
}

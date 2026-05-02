export type LinkRow = {
  id: string;
  slug: string;
  destination_url: string;
  redirect_type: 301 | 302;
  status: "active" | "paused";
  expires_at: Date | null;
};

export type ClickInsert = {
  linkId: string;
  ip: string | null;
  referrer: string | null;
  userAgent: string | null;
  acceptLanguage: string | null;
};

export interface RedirectDeps {
  findLinkBySlug(slug: string): Promise<LinkRow | null>;
  /** Returns `click_events.id` for async enrichment (ADR-0003). */
  insertClick(payload: ClickInsert): Promise<number>;
  enrichClick(clickId: number, requestHeaders: Headers): Promise<void>;
  now(): Date;
  trustProxyHops: number;
}

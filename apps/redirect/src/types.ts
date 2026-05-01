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
  insertClick(payload: ClickInsert): Promise<void>;
  now(): Date;
  trustProxyHops: number;
}

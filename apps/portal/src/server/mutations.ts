import { generateRandomSlug, parseSlugInput, validateDestinationUrl } from "@url-shortener/core";
import { notesMarkdownTooLarge } from "../lib/render-notes";
import { getSql } from "./db";

const PG_UNIQUE = "23505";

/** Postgres `23505` — used by link slug and API key prefix uniqueness (**R-021**). */
export function postgresUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: string }).code === PG_UNIQUE
  );
}

export type CreateLinkInput = {
  destination_url: string;
  slugField: string | null;
  redirect_type: 301 | 302;
  status: "active" | "paused";
  display_title: string | null;
  notes_markdown: string | null;
  expires_at: Date | null;
};

export type MutationErrorCode =
  | "invalid_destination"
  | "invalid_slug"
  | "duplicate_slug"
  | "invalid_expires"
  | "notes_too_large";

export type MutationResult =
  | { ok: true }
  | { ok: false; code: MutationErrorCode };

export type CreateLinkResult =
  | { ok: true; linkId: string }
  | { ok: false; code: MutationErrorCode };

/** Validation shared by portal forms and `createLink` (**R-005**, **R-020**). */
export function preflightCreateLink(input: CreateLinkInput): MutationErrorCode | null {
  const dest = validateDestinationUrl(input.destination_url);
  if (!dest.ok) return "invalid_destination";
  if (notesMarkdownTooLarge(input.notes_markdown)) return "notes_too_large";

  const raw = (input.slugField ?? "").trim();
  if (raw !== "") {
    if (parseSlugInput(input.slugField) == null) return "invalid_slug";
  }

  return null;
}

export type UpdateLinkInput = CreateLinkInput & { id: string };

/** Update path (**R-022**) always requires editable slug grammar. */
export function preflightUpdateLink(input: UpdateLinkInput): MutationErrorCode | null {
  const dest = validateDestinationUrl(input.destination_url);
  if (!dest.ok) return "invalid_destination";
  if (notesMarkdownTooLarge(input.notes_markdown)) return "notes_too_large";

  if (parseSlugInput(input.slugField) == null) return "invalid_slug";

  return null;
}

/** Empty / missing → null; invalid string → `"invalid"`. */
export function parseExpiresAtForm(raw: string | null | undefined): Date | null | "invalid" {
  if (raw == null) return null;
  const s = raw.trim();
  if (s === "") return null;
  const hasTz = /Z$/i.test(s) || /[+-]\d{2}:?\d{2}$/.test(s);
  const normalized = hasTz ? s : `${s}Z`;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return "invalid";
  return d;
}

export async function createLink(input: CreateLinkInput): Promise<CreateLinkResult> {
  const pre = preflightCreateLink(input);
  if (pre) return { ok: false, code: pre };

  const vd = validateDestinationUrl(input.destination_url);
  if (!vd.ok) return { ok: false, code: "invalid_destination" };

  const raw = (input.slugField ?? "").trim();
  let slug: string;

  const sql = getSql();

  if (raw !== "") {
    const parsed = parseSlugInput(input.slugField);
    if (parsed == null) return { ok: false, code: "invalid_slug" };
    slug = parsed;
    try {
      const rows = await sql<{ id: string }[]>`
        INSERT INTO links (
          id, slug, destination_url, display_title, redirect_type, status,
          expires_at, notes_markdown
        )
        VALUES (
          ${crypto.randomUUID()}::uuid,
          ${slug},
          ${vd.normalized},
          ${input.display_title},
          ${input.redirect_type},
          ${input.status},
          ${input.expires_at},
          ${input.notes_markdown}
        )
        RETURNING id
      `;
      return { ok: true, linkId: rows[0]!.id };
    } catch (e) {
      if (postgresUniqueViolation(e)) return { ok: false, code: "duplicate_slug" };
      throw e;
    }
  }

  for (let attempt = 0; attempt < 14; attempt++) {
    slug = generateRandomSlug(8);
    try {
      const rows = await sql<{ id: string }[]>`
        INSERT INTO links (
          id, slug, destination_url, display_title, redirect_type, status,
          expires_at, notes_markdown
        )
        VALUES (
          ${crypto.randomUUID()}::uuid,
          ${slug},
          ${vd.normalized},
          ${input.display_title},
          ${input.redirect_type},
          ${input.status},
          ${input.expires_at},
          ${input.notes_markdown}
        )
        RETURNING id
      `;
      return { ok: true, linkId: rows[0]!.id };
    } catch (e) {
      if (!postgresUniqueViolation(e)) throw e;
    }
  }

  return { ok: false, code: "duplicate_slug" };
}

export async function updateLink(input: UpdateLinkInput): Promise<MutationResult> {
  const pre = preflightUpdateLink(input);
  if (pre) return { ok: false, code: pre };

  const vd = validateDestinationUrl(input.destination_url);
  if (!vd.ok) return { ok: false, code: "invalid_destination" };

  const parsed = parseSlugInput(input.slugField);
  if (parsed == null) return { ok: false, code: "invalid_slug" };

  const sql = getSql();

  try {
    const rows = await sql<{ id: string }[]>`
      UPDATE links SET
        slug = ${parsed},
        destination_url = ${vd.normalized},
        display_title = ${input.display_title},
        redirect_type = ${input.redirect_type},
        status = ${input.status},
        expires_at = ${input.expires_at},
        notes_markdown = ${input.notes_markdown},
        updated_at = now()
      WHERE id = ${input.id}::uuid
      RETURNING id
    `;
    if (rows.length === 0) return { ok: false, code: "invalid_slug" };
    return { ok: true };
  } catch (e) {
    if (postgresUniqueViolation(e)) return { ok: false, code: "duplicate_slug" };
    throw e;
  }
}

/** R-023 — deletes row so redirect path sees unknown slug (**R-002**) thereafter. */
export async function deleteLink(id: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    DELETE FROM links WHERE id = ${id}::uuid RETURNING id
  `;
  return rows.length > 0;
}

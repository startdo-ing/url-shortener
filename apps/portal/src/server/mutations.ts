import { generateRandomSlug, parseSlugInput, validateDestinationUrl } from "@url-shortener/core";
import { getSql } from "./db";

const PG_UNIQUE = "23505";

function isUniqueViolation(e: unknown): boolean {
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
};

export type MutationErrorCode =
  | "invalid_destination"
  | "invalid_slug"
  | "duplicate_slug";

export type MutationResult =
  | { ok: true }
  | { ok: false; code: MutationErrorCode };

export async function createLink(input: CreateLinkInput): Promise<MutationResult> {
  const dest = validateDestinationUrl(input.destination_url);
  if (!dest.ok) return { ok: false, code: "invalid_destination" };

  const raw = (input.slugField ?? "").trim();
  let slug: string;

  const sql = getSql();

  if (raw !== "") {
    const parsed = parseSlugInput(input.slugField);
    if (parsed == null) return { ok: false, code: "invalid_slug" };
    slug = parsed;
    try {
      await sql`
        INSERT INTO links (
          id, slug, destination_url, display_title, redirect_type, status,
          expires_at, notes_markdown
        )
        VALUES (
          ${crypto.randomUUID()}::uuid,
          ${slug},
          ${dest.normalized},
          ${input.display_title},
          ${input.redirect_type},
          ${input.status},
          NULL,
          ${input.notes_markdown}
        )
      `;
      return { ok: true };
    } catch (e) {
      if (isUniqueViolation(e)) return { ok: false, code: "duplicate_slug" };
      throw e;
    }
  }

  for (let attempt = 0; attempt < 14; attempt++) {
    slug = generateRandomSlug(8);
    try {
      await sql`
        INSERT INTO links (
          id, slug, destination_url, display_title, redirect_type, status,
          expires_at, notes_markdown
        )
        VALUES (
          ${crypto.randomUUID()}::uuid,
          ${slug},
          ${dest.normalized},
          ${input.display_title},
          ${input.redirect_type},
          ${input.status},
          NULL,
          ${input.notes_markdown}
        )
      `;
      return { ok: true };
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
    }
  }

  return { ok: false, code: "duplicate_slug" };
}

export type UpdateLinkInput = CreateLinkInput & { id: string };

export async function updateLink(input: UpdateLinkInput): Promise<MutationResult> {
  const dest = validateDestinationUrl(input.destination_url);
  if (!dest.ok) return { ok: false, code: "invalid_destination" };

  const parsed = parseSlugInput(input.slugField);
  if (parsed == null) return { ok: false, code: "invalid_slug" };

  const sql = getSql();

  try {
    const rows = await sql<{ id: string }[]>`
      UPDATE links SET
        slug = ${parsed},
        destination_url = ${dest.normalized},
        display_title = ${input.display_title},
        redirect_type = ${input.redirect_type},
        status = ${input.status},
        notes_markdown = ${input.notes_markdown},
        updated_at = now()
      WHERE id = ${input.id}::uuid
      RETURNING id
    `;
    if (rows.length === 0) return { ok: false, code: "invalid_slug" };
    return { ok: true };
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, code: "duplicate_slug" };
    throw e;
  }
}

export async function deleteLink(id: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    DELETE FROM links WHERE id = ${id}::uuid RETURNING id
  `;
  return rows.length > 0;
}

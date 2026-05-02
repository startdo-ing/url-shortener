import type { APIRoute } from "astro";
import { verifyApiKeyFromAuthorization } from "../../../../server/api-keys";
import { getLinkById, listLinks } from "../../../../server/db";
import { getTagsForLinkIds, setLinkTags } from "../../../../server/marketer";
import { createLink } from "../../../../server/mutations";
import { applyUtmTemplateIfPresent } from "../../../../server/utm-apply";
import { jsonError, jsonOk, jsonUnauthorized } from "../../../../server/v1-http";
import { linkToJson, readExpiresFromBody, readTagsFromBody } from "../../../../server/v1-links";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  if (!(await verifyApiKeyFromAuthorization(request.headers.get("authorization")))) {
    return jsonUnauthorized();
  }
  const rows = await listLinks();
  const tagMap = rows.length ? await getTagsForLinkIds(rows.map((r) => r.id)) : new Map();
  const links = rows.map((r) => linkToJson(r, tagMap.get(r.id) ?? []));
  return jsonOk({ links });
};

export const POST: APIRoute = async ({ request }) => {
  if (!(await verifyApiKeyFromAuthorization(request.headers.get("authorization")))) {
    return jsonUnauthorized();
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, "invalid_json");
  }

  const destRaw = body.destination_url;
  if (typeof destRaw !== "string" || destRaw.trim() === "") {
    return jsonError(400, "invalid_destination");
  }

  let destination_url = destRaw.trim();
  destination_url = await applyUtmTemplateIfPresent(
    destination_url,
    typeof body.utm_template_id === "string" ? body.utm_template_id : null,
  );

  const slugField = typeof body.slug === "string" && body.slug.trim() !== "" ? body.slug : null;
  const redirect_type = Number(body.redirect_type) === 301 ? 301 : 302;
  const status = body.status === "paused" ? "paused" : "active";
  const display_title =
    typeof body.display_title === "string" && body.display_title.trim() !== ""
      ? body.display_title.trim()
      : null;
  const notes_markdown =
    typeof body.notes_markdown === "string" && body.notes_markdown.trim() !== ""
      ? body.notes_markdown.trim()
      : null;

  const expParsed = readExpiresFromBody(body);
  if (expParsed === "invalid") {
    return jsonError(400, "invalid_expires");
  }

  const r = await createLink({
    destination_url,
    slugField,
    redirect_type,
    status,
    display_title,
    notes_markdown,
    expires_at: expParsed,
  });

  if (!r.ok) {
    const statusCode = r.code === "duplicate_slug" ? 409 : 400;
    return jsonError(statusCode, r.code);
  }

  const tags = readTagsFromBody(body);
  await setLinkTags(r.linkId, tags);

  const row = await getLinkById(r.linkId);
  if (!row) return jsonError(500, "internal");
  return jsonOk({ link: linkToJson(row, tags) }, 201);
};

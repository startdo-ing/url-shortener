import type { APIRoute } from "astro";
import { verifyApiKeyFromAuthorization } from "../../../../server/api-keys";
import { getLinkById } from "../../../../server/db";
import { deleteLink } from "../../../../server/mutations";
import { getTagsForLinkIds, setLinkTags } from "../../../../server/marketer";
import { updateLink } from "../../../../server/mutations";
import { applyUtmTemplateIfPresent } from "../../../../server/utm-apply";
import { jsonError, jsonOk, jsonUnauthorized } from "../../../../server/v1-http";
import { linkToJson, readExpiresFromBody, readTagsFromBody } from "../../../../server/v1-links";

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  if (!(await verifyApiKeyFromAuthorization(request.headers.get("authorization")))) {
    return jsonUnauthorized();
  }
  const id = params.id;
  if (!id) return jsonError(400, "invalid_id");

  const row = await getLinkById(id);
  if (!row) return jsonError(404, "not_found");
  const tagMap = await getTagsForLinkIds([id]);
  return jsonOk({ link: linkToJson(row, tagMap.get(id) ?? []) });
};

export const PATCH: APIRoute = async ({ params, request }) => {
  if (!(await verifyApiKeyFromAuthorization(request.headers.get("authorization")))) {
    return jsonUnauthorized();
  }
  const id = params.id;
  if (!id) return jsonError(400, "invalid_id");

  const existing = await getLinkById(id);
  if (!existing) return jsonError(404, "not_found");

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

  const slugField = typeof body.slug === "string" ? body.slug : null;
  if (slugField == null || slugField.trim() === "") {
    return jsonError(400, "invalid_slug");
  }

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

  const r = await updateLink({
    id,
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

  let tagList: string[] | null = null;
  if (Object.prototype.hasOwnProperty.call(body, "tags")) {
    tagList = readTagsFromBody(body);
    await setLinkTags(id, tagList);
  }

  const row = await getLinkById(id);
  if (!row) return jsonError(500, "internal");
  const tagMap = await getTagsForLinkIds([id]);
  return jsonOk({ link: linkToJson(row, tagMap.get(id) ?? []) });
};

export const DELETE: APIRoute = async ({ params, request }) => {
  if (!(await verifyApiKeyFromAuthorization(request.headers.get("authorization")))) {
    return jsonUnauthorized();
  }
  const id = params.id;
  if (!id) return jsonError(400, "invalid_id");

  const ok = await deleteLink(id);
  if (!ok) return jsonError(404, "not_found");
  return new Response(null, { status: 204 });
};

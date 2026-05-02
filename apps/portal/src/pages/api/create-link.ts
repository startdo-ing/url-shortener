import type { APIRoute } from "astro";
import { parseTagNamesInput } from "../../lib/tag-input";
import { setLinkTags } from "../../server/marketer";
import { createLink, parseExpiresAtForm } from "../../server/mutations";
import { applyUtmTemplateIfPresent } from "../../server/utm-apply";

export const prerender = false;

function read(form: FormData, key: string): string | null {
  const v = form.get(key);
  return v == null ? null : String(v);
}

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();

  let destination_url = String(form.get("destination_url") ?? "");
  destination_url = await applyUtmTemplateIfPresent(destination_url, String(form.get("utm_template_id") ?? ""));

  const redirect_type = Number(form.get("redirect_type")) === 301 ? 301 : 302;

  const statusRaw = form.get("status");
  const status = statusRaw === "paused" ? "paused" : "active";

  const slugRaw = form.get("slug");
  const slugField = slugRaw == null || String(slugRaw).trim() === "" ? null : String(slugRaw);

  const dt = read(form, "display_title");
  const display_title = dt?.trim() ? dt.trim() : null;

  const nm = read(form, "notes_markdown");
  const notes_markdown = nm?.trim() ? nm.trim() : null;

  const expRaw = read(form, "expires_at");
  const expParsed = parseExpiresAtForm(expRaw);
  if (expParsed === "invalid") {
    return redirect("/links/new?error=invalid_expires", 303);
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
    return redirect(`/links/new?error=${encodeURIComponent(r.code)}`, 303);
  }

  const tags = parseTagNamesInput(String(form.get("tags") ?? ""));
  await setLinkTags(r.linkId, tags);

  return redirect("/?created=1", 303);
};

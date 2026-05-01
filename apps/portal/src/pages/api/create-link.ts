import type { APIRoute } from "astro";
import { createLink } from "../../server/mutations";

export const prerender = false;

function read(form: FormData, key: string): string | null {
  const v = form.get(key);
  return v == null ? null : String(v);
}

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();

  const destination_url = String(form.get("destination_url") ?? "");

  const redirect_type = Number(form.get("redirect_type")) === 301 ? 301 : 302;

  const statusRaw = form.get("status");
  const status = statusRaw === "paused" ? "paused" : "active";

  const slugRaw = form.get("slug");
  const slugField = slugRaw == null || String(slugRaw).trim() === "" ? null : String(slugRaw);

  const dt = read(form, "display_title");
  const display_title = dt?.trim() ? dt.trim() : null;

  const nm = read(form, "notes_markdown");
  const notes_markdown = nm?.trim() ? nm.trim() : null;

  const r = await createLink({
    destination_url,
    slugField,
    redirect_type,
    status,
    display_title,
    notes_markdown,
  });

  if (!r.ok) {
    return redirect(`/links/new?error=${encodeURIComponent(r.code)}`, 303);
  }

  return redirect("/?created=1", 303);
};

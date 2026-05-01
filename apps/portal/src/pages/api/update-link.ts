import type { APIRoute } from "astro";
import { updateLink } from "../../server/mutations";

export const prerender = false;

function read(form: FormData, key: string): string | null {
  const v = form.get(key);
  return v == null ? null : String(v);
}

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const id = String(form.get("id") ?? "");
  if (!id) {
    return redirect("/?error=missing_id", 303);
  }

  const destination_url = String(form.get("destination_url") ?? "");
  const redirect_type = Number(form.get("redirect_type")) === 301 ? 301 : 302;
  const statusRaw = form.get("status");
  const status = statusRaw === "paused" ? "paused" : "active";
  const slugField = read(form, "slug");

  const dt = read(form, "display_title");
  const display_title = dt?.trim() ? dt.trim() : null;
  const nm = read(form, "notes_markdown");
  const notes_markdown = nm?.trim() ? nm.trim() : null;

  const r = await updateLink({
    id,
    destination_url,
    slugField,
    redirect_type,
    status,
    display_title,
    notes_markdown,
  });

  if (!r.ok) {
    return redirect(`/links/${encodeURIComponent(id)}/edit?error=${encodeURIComponent(r.code)}`, 303);
  }

  return redirect("/?updated=1", 303);
};

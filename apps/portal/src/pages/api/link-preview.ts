import type { APIRoute } from "astro";
import { applyLinkPreviewFetch } from "../../server/link-preview";

export const prerender = false;

function read(form: FormData, key: string): string | null {
  const v = form.get(key);
  return v == null ? null : String(v);
}

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const id = String(form.get("id") ?? "").trim();
  if (!id) {
    return redirect("/?preview=error", 303);
  }

  const returnTo = read(form, "return_to");
  const base = returnTo === "home" ? "/" : `/links/${encodeURIComponent(id)}/edit`;

  const r = await applyLinkPreviewFetch(id, fetch);
  if (!r.ok) {
    return redirect(`${base}?preview=error`, 303);
  }

  const q = r.unfurlOk ? "preview=ok" : "preview=error";
  return redirect(`${base}?${q}`, 303);
};

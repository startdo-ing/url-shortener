import type { APIRoute } from "astro";
import { deleteTagById } from "../../server/marketer";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const id = String(form.get("id") ?? "").trim();
  if (!id) return redirect("/tags?error=missing", 303);
  await deleteTagById(id);
  return redirect("/tags?deleted=1", 303);
};

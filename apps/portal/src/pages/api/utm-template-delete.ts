import type { APIRoute } from "astro";
import { deleteUtmTemplateById } from "../../server/marketer";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const id = String(form.get("id") ?? "").trim();
  if (!id) return redirect("/utm?error=missing", 303);
  await deleteUtmTemplateById(id);
  return redirect("/utm?deleted=1", 303);
};

import type { APIRoute } from "astro";
import { deleteLink } from "../../server/mutations";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const id = String(form.get("id") ?? "");
  await deleteLink(id);
  return redirect("/?deleted=1", 303);
};

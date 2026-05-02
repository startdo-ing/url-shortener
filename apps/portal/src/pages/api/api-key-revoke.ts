import type { APIRoute } from "astro";
import { revokeApiKey } from "../../server/api-keys";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const id = String(form.get("id") ?? "").trim();
  if (!id) return redirect("/api-keys?error=missing", 303);
  await revokeApiKey(id);
  return redirect("/api-keys?revoked=1", 303);
};

import type { APIRoute } from "astro";
import { createApiKey } from "../../server/api-keys";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const name = String(form.get("name") ?? "");
  const r = await createApiKey(name);
  const once = Buffer.from(r.plaintext, "utf8").toString("base64url");
  return redirect(`/api-keys?created=1&once=${encodeURIComponent(once)}`, 303);
};

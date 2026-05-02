import type { APIRoute } from "astro";
import { createUtmTemplate } from "../../server/marketer";

export const prerender = false;

function read(form: FormData, key: string): string | null {
  const v = form.get(key);
  return v == null ? null : String(v);
}

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const name = String(form.get("name") ?? "");
  const r = await createUtmTemplate({
    name,
    utm_source: read(form, "utm_source"),
    utm_medium: read(form, "utm_medium"),
    utm_campaign: read(form, "utm_campaign"),
    utm_term: read(form, "utm_term"),
    utm_content: read(form, "utm_content"),
  });
  if (r === "duplicate") return redirect("/utm?error=duplicate", 303);
  if (r === "invalid") return redirect("/utm?error=invalid", 303);
  return redirect("/utm?created=1", 303);
};

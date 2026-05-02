import { mergeUtmParamsIntoUrl } from "@url-shortener/core";
import { getUtmTemplateById } from "./marketer";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function applyUtmTemplateIfPresent(
  destination_url: string,
  utm_template_id: string | null | undefined,
): Promise<string> {
  const tid = (utm_template_id ?? "").trim();
  if (!UUID_RE.test(tid)) return destination_url;
  const tmpl = await getUtmTemplateById(tid);
  if (!tmpl) return destination_url;
  return mergeUtmParamsIntoUrl(destination_url, {
    utm_source: tmpl.utm_source,
    utm_medium: tmpl.utm_medium,
    utm_campaign: tmpl.utm_campaign,
    utm_term: tmpl.utm_term,
    utm_content: tmpl.utm_content,
  });
}

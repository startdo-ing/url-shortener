import type { APIRoute } from "astro";
import QRCode from "qrcode";
import { getLinkById } from "../../../../server/db";

export const prerender = false;

function shortUrlForSlug(slug: string): string | null {
  const raw = import.meta.env.PUBLIC_SHORT_BASE_URL;
  if (raw == null || String(raw).trim() === "") return null;
  const base = String(raw).replace(/\/$/, "");
  return `${base}/${encodeURIComponent(slug)}`;
}

export const GET: APIRoute = async ({ params }) => {
  const id = params.id;
  if (!id) return new Response("Not found", { status: 404 });

  const row = await getLinkById(id);
  if (!row) return new Response("Not found", { status: 404 });

  const target = shortUrlForSlug(row.slug);
  if (!target) {
    return new Response("PUBLIC_SHORT_BASE_URL is not set", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const svg = await QRCode.toString(target, {
    type: "svg",
    margin: 1,
    color: { dark: "#0F1112", light: "#FFFFFF" },
  });

  return new Response(svg, {
    status: 200,
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
};

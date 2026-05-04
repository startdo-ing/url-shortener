import type { APIRoute } from "astro";
import QRCode from "qrcode";
import { getLinkById } from "../../../../server/db";
import { QR_SVG_THEME, shortUrlForSlug } from "../../../../server/qr-target";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const id = params.id;
  if (!id) return new Response("Not found", { status: 404 });

  const row = await getLinkById(id);
  if (!row) return new Response("Not found", { status: 404 });

  const base = import.meta.env.PUBLIC_SHORT_BASE_URL as string | undefined;
  const target = shortUrlForSlug(base, row.slug);
  if (!target) {
    return new Response("PUBLIC_SHORT_BASE_URL is not set", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const svg = await QRCode.toString(target, {
    type: "svg",
    margin: QR_SVG_THEME.margin,
    color: { ...QR_SVG_THEME.color },
  });

  return new Response(svg, {
    status: 200,
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
};

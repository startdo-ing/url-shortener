import type { MiddlewareHandler } from "astro";
import { authMode, validateSession } from "./server/session-auth";

export const onRequest: MiddlewareHandler = async (context, next) => {
  const path = context.url.pathname;
  const sid = context.cookies.get("sid")?.value;
  const authed = authMode() === "off" ? true : await validateSession(sid);
  context.locals.authed = authed;

  if (authMode() !== "session") {
    return next();
  }

  if (
    path.startsWith("/api/v1") ||
    path === "/login" ||
    path.startsWith("/login/") ||
    path === "/api/login" ||
    path === "/api/logout" ||
    path.startsWith("/_astro/")
  ) {
    return next();
  }

  if (authed) {
    return next();
  }

  if (path.startsWith("/api/")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  return Response.redirect(new URL("/login", context.url), 302);
};

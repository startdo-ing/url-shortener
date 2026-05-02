import type { APIRoute } from "astro";
import { deleteSession } from "../../server/session-auth";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, redirect }) => {
  const sid = cookies.get("sid")?.value;
  if (sid) await deleteSession(sid);
  cookies.delete("sid", { path: "/" });
  return redirect("/login", 303);
};

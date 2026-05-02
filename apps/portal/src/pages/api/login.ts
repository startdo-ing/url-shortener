import type { APIRoute } from "astro";
import {
  authMode,
  createSession,
  deleteSession,
  portalPasswordHash,
  sessionCookieOptions,
} from "../../server/session-auth";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  if (authMode() !== "session") {
    return redirect("/login?error=auth_off", 303);
  }
  const hash = portalPasswordHash();
  if (hash == null) {
    return redirect("/login?error=config", 303);
  }

  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  let ok = false;
  try {
    ok = await Bun.password.verify(password, hash);
  } catch {
    ok = false;
  }
  if (!ok) {
    return redirect("/login?error=bad", 303);
  }

  const old = cookies.get("sid")?.value;
  if (old) await deleteSession(old);

  const id = await createSession();
  cookies.set("sid", id, sessionCookieOptions());
  return redirect("/", 303);
};

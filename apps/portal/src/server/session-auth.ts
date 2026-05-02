import { getSql } from "./db";

const WEEK_SEC = 60 * 60 * 24 * 7;

export function authMode(): "off" | "session" {
  const m = (process.env.AUTH_MODE ?? "off").toLowerCase();
  return m === "session" ? "session" : "off";
}

export function portalPasswordHash(): string | null {
  const h = process.env.PORTAL_AUTH_HASH;
  if (h == null || String(h).trim() === "") return null;
  return String(h).trim();
}

export async function createSession(): Promise<string> {
  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    INSERT INTO sessions (id, expires_at)
    VALUES (${crypto.randomUUID()}::uuid, now() + interval '7 days')
    RETURNING id
  `;
  return rows[0]!.id;
}

export async function validateSession(sessionId: string | undefined | null): Promise<boolean> {
  if (sessionId == null || sessionId.trim() === "") return false;
  try {
    const sql = getSql();
    const rows = await sql<{ x: number }[]>`
      SELECT 1 AS x FROM sessions
      WHERE id = ${sessionId}::uuid AND expires_at > now()
      LIMIT 1
    `;
    return rows.length > 0;
  } catch {
    return false;
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM sessions WHERE id = ${sessionId}::uuid`;
}

export function sessionCookieOptions(): {
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  maxAge: number;
} {
  const secure = process.env.NODE_ENV === "production" || process.env.FORCE_SECURE_COOKIES === "1";
  return {
    path: "/",
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: WEEK_SEC,
  };
}

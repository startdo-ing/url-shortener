/**
 * Opt-in Postgres integration: **`RUN_INTEGRATION_TESTS=1`** + **`DATABASE_URL`**, after **`bun run db:migrate`**.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { generateApiKeyPlaintext } from "./api-key-crypto";

const RUN_INTEGRATION =
  process.env.RUN_INTEGRATION_TESTS === "1" &&
  typeof process.env.DATABASE_URL === "string" &&
  process.env.DATABASE_URL.trim().length > 0;

if (RUN_INTEGRATION) {
  describe("Postgres integration — R-033 / R-023 / R-034", () => {
    let GET: typeof import("../pages/api/v1/links/index.ts").GET;
    let POST: typeof import("../pages/api/v1/links/index.ts").POST;
    let GET_BY_ID: typeof import("../pages/api/v1/links/[id].ts").GET;
    let DELETE_BY_ID: typeof import("../pages/api/v1/links/[id].ts").DELETE;

    const key = generateApiKeyPlaintext();
    const authHeader = `Bearer ${key.plaintext}`;
    const slug = `it-${key.keyPrefix}`;

    beforeAll(async () => {
      const { getSql } = await import("./db");
      const sql = getSql();

      await sql`
        INSERT INTO api_keys (name, key_prefix, key_hash)
        VALUES (${`integration:${slug}`}, ${key.keyPrefix}, ${key.keyHash})
      `;

      const indexMod = await import("../pages/api/v1/links/index.ts");
      GET = indexMod.GET;
      POST = indexMod.POST;

      const idMod = await import("../pages/api/v1/links/[id].ts");
      GET_BY_ID = idMod.GET;
      DELETE_BY_ID = idMod.DELETE;
    });

    afterAll(async () => {
      const { getSql } = await import("./db");
      const sql = getSql();

      await sql`DELETE FROM links WHERE slug = ${slug}`;
      await sql`DELETE FROM api_keys WHERE key_prefix = ${key.keyPrefix}`;
    });

    test("R-034: session create → validate → delete revokes (**createSession**, **validateSession**)", async () => {
      const { createSession, validateSession, deleteSession } = await import("./session-auth");
      const id = await createSession();
      expect(await validateSession(id)).toBe(true);
      await deleteSession(id);
      expect(await validateSession(id)).toBe(false);
    });

    test("R-033: missing Authorization ⇒ 401 `{ error: \"unauthorized\" }` on GET /api/v1/links", async () => {
      const res = await GET({ request: new Request("http://localhost/api/v1/links") } as never);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "unauthorized" });
    });

    test("R-033: revoked API key ⇒ 401 (row exists but `revoked_at` set)", async () => {
      const k = generateApiKeyPlaintext();
      const hdr = `Bearer ${k.plaintext}`;
      const { getSql } = await import("./db");
      const { revokeApiKey } = await import("./api-keys");
      const sql = getSql();

      const rows = await sql<{ id: string }[]>`
        INSERT INTO api_keys (name, key_prefix, key_hash)
        VALUES (${`integration-revoked:${k.keyPrefix}`}, ${k.keyPrefix}, ${k.keyHash})
        RETURNING id
      `;
      const keyId = rows[0]!.id;
      expect(await revokeApiKey(keyId)).toBe(true);

      const res = await GET({
        request: new Request("http://localhost/api/v1/links", { headers: { authorization: hdr } }),
      } as never);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "unauthorized" });

      await sql`DELETE FROM api_keys WHERE id = ${keyId}::uuid`;
    });

    test("R-023: POST /api/v1/links ⇒ GET by id ⇒ DELETE ⇒ GET 404", async () => {
      const create = await POST({
        request: new Request("http://localhost/api/v1/links", {
          method: "POST",
          headers: {
            authorization: authHeader,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            destination_url: "https://example.com/integration-target",
            slug,
            redirect_type: 302,
            status: "active",
          }),
        }),
      } as never);

      expect(create.status).toBe(201);
      const created = (await create.json()) as { link: { id: string } };
      const id = created.link.id;

      const got = await GET_BY_ID({
        params: { id },
        request: new Request("http://localhost/api/v1/links/x", { headers: { authorization: authHeader } }),
      } as never);
      expect(got.status).toBe(200);

      const del = await DELETE_BY_ID({
        params: { id },
        request: new Request("http://localhost/api/v1/links/x", {
          method: "DELETE",
          headers: { authorization: authHeader },
        }),
      } as never);
      expect(del.status).toBe(204);

      const gone = await GET_BY_ID({
        params: { id },
        request: new Request("http://localhost/api/v1/links/x", { headers: { authorization: authHeader } }),
      } as never);
      expect(gone.status).toBe(404);
      expect((await gone.json()).error).toBe("not_found");
    });
  });
}

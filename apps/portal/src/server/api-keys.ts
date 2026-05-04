import { getSql } from "./db";
import { postgresUniqueViolation } from "./mutations";
import { generateApiKeyPlaintext, parseApiKeyBearer, sha256Hex, timingSafeEqualHex64 } from "./api-key-crypto";

/** R-033 — `usk_<12hex>.<secret>` shape before Postgres lookup. */
export function validateUskApiKeyBearer(authorization: string | null): { token: string; keyPrefix: string } | null {
  const token = parseApiKeyBearer(authorization);
  if (token == null || !token.startsWith("usk_")) return null;
  const dot = token.indexOf(".", 4);
  if (dot < 0) return null;
  const keyPrefix = token.slice(4, dot);
  if (keyPrefix.length !== 12 || !/^[a-f0-9]{12}$/.test(keyPrefix)) return null;
  return { token, keyPrefix };
}

export type ApiKeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  created_at: Date;
  revoked_at: Date | null;
};

export async function verifyApiKeyFromAuthorization(authorization: string | null): Promise<boolean> {
  const parsed = validateUskApiKeyBearer(authorization);
  if (parsed == null) return false;
  const { token, keyPrefix } = parsed;

  const sql = getSql();
  const rows = await sql<Pick<ApiKeyRow, "key_hash">[]>`
    SELECT key_hash FROM api_keys
    WHERE key_prefix = ${keyPrefix} AND revoked_at IS NULL
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return false;
  const incomingHash = sha256Hex(token);
  return timingSafeEqualHex64(incomingHash, row.key_hash);
}

export async function listActiveApiKeys(): Promise<Omit<ApiKeyRow, "key_hash">[]> {
  const sql = getSql();
  return await sql<Omit<ApiKeyRow, "key_hash">[]>`
    SELECT id, name, key_prefix, created_at, revoked_at
    FROM api_keys
    WHERE revoked_at IS NULL
    ORDER BY created_at DESC
  `;
}

export async function createApiKey(name: string): Promise<{ plaintext: string; id: string; key_prefix: string }> {
  const sql = getSql();
  for (let i = 0; i < 8; i++) {
    const { plaintext, keyPrefix, keyHash } = generateApiKeyPlaintext();
    try {
      const rows = await sql<{ id: string }[]>`
        INSERT INTO api_keys (id, name, key_prefix, key_hash)
        VALUES (${crypto.randomUUID()}::uuid, ${name.trim()}, ${keyPrefix}, ${keyHash})
        RETURNING id
      `;
      return { plaintext, id: rows[0]!.id, key_prefix: keyPrefix };
    } catch (e: unknown) {
      if (postgresUniqueViolation(e)) continue;
      throw e;
    }
  }
  throw new Error("could not allocate unique api key prefix");
}

export async function revokeApiKey(id: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    UPDATE api_keys SET revoked_at = now()
    WHERE id = ${id}::uuid AND revoked_at IS NULL
    RETURNING id
  `;
  return rows.length > 0;
}

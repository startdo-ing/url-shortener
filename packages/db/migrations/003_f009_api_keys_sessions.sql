-- F-009: API keys (hashed) + portal sessions (see docs/features/F-009-api-and-auth.md)

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  CONSTRAINT api_keys_prefix_len CHECK (char_length(key_prefix) = 12),
  CONSTRAINT api_keys_hash_len CHECK (char_length(key_hash) = 64)
);

CREATE UNIQUE INDEX api_keys_key_prefix_active_idx ON api_keys (key_prefix) WHERE revoked_at IS NULL;

CREATE INDEX api_keys_revoked_idx ON api_keys (revoked_at);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

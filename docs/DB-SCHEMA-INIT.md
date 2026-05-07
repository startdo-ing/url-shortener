# Database Schema V1

## Purpose
Define the initial relational schema contract shared by:
- Dashboard app (Astro + Svelte)
- Redirect app (Bun.js)

## Database Engine
SQLite via Bun's built-in `bun:sqlite`. See ADR-008.

SQLite type mapping notes:
- No native UUID type — use TEXT, generate with `crypto.randomUUID()` in application.
- No timestamptz — use INTEGER (Unix timestamp ms) or TEXT (ISO 8601). TEXT chosen for readability.
- No boolean type — use INTEGER (0/1).
- No bigserial — use INTEGER PRIMARY KEY AUTOINCREMENT.
- No jsonb — use TEXT, store as JSON string.
- No smallint constraint — use INTEGER with CHECK constraint.
- WAL mode must be enabled at connection time for concurrent access.

## Design Principles
- Keep redirect lookup path simple and index-friendly.
- Enforce domain + slug uniqueness at the database layer.
- Preserve auditability for management actions.

## Tables

### users
Columns:
- id TEXT pk (uuid v4)
- keycloak_sub TEXT unique not null
- email TEXT unique not null
- display_name TEXT null
- role TEXT not null default 'member'
- is_active INTEGER not null default 1
- created_at TEXT not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
- updated_at TEXT not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))

Notes:
- No local password is stored because authentication is handled by Keycloak OIDC.
- role values: admin, member.
- First local user created through setup onboarding is assigned admin.

### domains
Columns:
- id TEXT pk (uuid v4)
- host TEXT unique not null
- is_active INTEGER not null default 1
- is_primary INTEGER not null default 0
- created_by TEXT not null references users(id)
- created_at TEXT not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
- updated_at TEXT not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))

Notes:
- host examples: c.anh.pw, go.anh.pw
- is_active and is_primary stored as 0/1 integers.

### short_links
Columns:
- id TEXT pk (uuid v4)
- domain_id TEXT not null references domains(id)
- slug TEXT not null
- target_url TEXT not null
- password_hash TEXT null
- status TEXT not null default 'active'
- http_code INTEGER not null default 302
- expires_at TEXT null
- created_by TEXT not null references users(id)
- created_at TEXT not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
- updated_at TEXT not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))

Constraints:
- unique (domain_id, slug)
- CHECK (status IN ('active', 'disabled'))
- CHECK (http_code IN (301, 302, 307))

Notes:
- Store only password hash, never raw password.

Indexes:
- idx_short_links_lookup on (domain_id, slug)
- idx_short_links_status on (status)
- idx_short_links_expires_at on (expires_at)

### click_events
Columns:
- id INTEGER pk autoincrement
- short_link_id TEXT not null references short_links(id)
- request_host TEXT not null
- request_path TEXT not null
- referer TEXT null
- user_agent TEXT null
- ip_hash TEXT null
- country_code TEXT null
- occurred_at TEXT not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))

Indexes:
- idx_click_events_link_time on (short_link_id, occurred_at desc)

### audit_logs
Columns:
- id INTEGER pk autoincrement
- actor_user_id TEXT null references users(id)
- action TEXT not null
- resource_type TEXT not null
- resource_id TEXT not null
- metadata TEXT not null default '{}'
- created_at TEXT not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))

Notes:
- metadata stored as JSON string (TEXT). Parse with JSON.parse() in application.

Indexes:
- idx_audit_logs_resource on (resource_type, resource_id)
- idx_audit_logs_created_at on (created_at desc)

## Redirect Query Contract
Minimal query shape for redirect app:

1. Resolve domain id by request host where domain is active.
2. Resolve short_links row by domain_id + slug.
3. Validate status and expires_at.
4. Return target_url + http_code.

## updated_at Field Policy
- All tables carry an `updated_at` column with a default of `now` at INSERT time.
- SQLite has no automatic ON UPDATE trigger for this column.
- Every UPDATE statement issued by the application must explicitly set `updated_at = new Date().toISOString()` in the same write.
- Drizzle ORM does not do this automatically — application code must include the field in every `.update().set({...})` call.
- This is not enforced at the database layer; it is a mandatory application-level convention.

## Migration Policy
- One migration per logical change.
- Forward-only migrations.
- No app deploy to production without migration review.
- Schema changes must update this document in same PR.

## Open Questions
- Multi-workspace tenancy: needed in v1 or v2?
- Retention window for raw click_events.
- Whether to store unhashed IP in restricted storage for fraud analysis.

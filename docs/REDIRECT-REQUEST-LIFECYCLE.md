# Redirect Request Lifecycle

## Purpose
Define the exact behavior of the redirect app for requests like:
- https://c.anh.pw/abc123

## Steps

1. Parse request
- Extract host and slug from incoming request.
- Normalize slug (trim spaces, reject invalid characters).

2. Resolve domain
- Lookup domains.host = request host and is_active = true.
- If not found: return 404.

3. Resolve short link
- Lookup short_links by domain_id + slug.
- If not found: return 404.

4. Evaluate link state
- If status is disabled: return 404.
- If expires_at is set and now() > expires_at: return 410.

5. Evaluate password protection
- Password-protected links are NOT in scope for Milestone 1.
- The `password_hash` column exists in the schema and is reserved for future use.
- For Milestone 1: if password_hash is set on a link, treat it as an unsupported configuration and return 404. Do not attempt to serve a password prompt.
- Full password-protection flow (HTML prompt form, POST validation, short-lived cookie) will be specified as a separate milestone before implementation.

6. Build redirect response
- Use stored http_code (301, 302, or 307).
- Set Location header to target_url.
- Return response immediately.

7. Emit click event
- Publish click metadata asynchronously when possible.
- Event failure must not block redirect response.

## Non-Functional Requirements
- Keep synchronous handler logic minimal.
- No heavy joins on redirect path.
- Avoid blocking I/O after redirect decision is made.

## Error Behavior
- Invalid slug format: 400
- Unknown host or slug: 404
- Expired link: 410
- Password-protected link (unsupported in Milestone 1): 404
- Internal server error: 500

## Caching Guidance
- Cache positive slug lookups with short TTL if needed.
- Invalidate cache on link update and disable operations.
- Never cache disabled/expired state longer than tolerated consistency window.

## Test Cases (Must Have)
- Active link redirects with expected status code.
- Disabled link returns 404.
- Expired link returns 410.
- Password-protected link returns 404 in Milestone 1.
- Unknown slug returns 404.
- Host mismatch returns 404.
- Event emitter failure does not break redirect.

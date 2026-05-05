# Keycloak Setup for management-web

This guide matches the current `management-web` implementation.

What is implemented now:
- Keycloak OIDC authorization-code login
- server-side session storage in `management-web`
- first-admin bootstrap when no local users exist yet
- local user provisioning into the `users` table by `keycloak_sub`
- admin-only local user-management page for role and access changes
- local role/permission contract for `admin` and `member`
- route-level access control: `/dashboard` requires a signed-in local user, `/users` requires a local admin
- protected `/dashboard` route
- RP-initiated Keycloak logout

What is not implemented yet:
- automatic Keycloak role synchronization into existing local users
- broader admin/member feature separation beyond the user-management page

Important current behavior:
- if no local users exist, the first successful SSO login is redirected to `/setup/first-admin` and can claim the initial local `admin` account
- after the first admin exists, newly seen Keycloak users are created locally with role `member`
- local authorization is managed in `management-web`; Keycloak roles are defined for future mapping but do not override existing local users in the current milestone
- Keycloak users must have an email address, or login is rejected

Current route access rules:
- `/dashboard`: any active local `admin` or `member`
- `/users`: active local `admin` only
- `/setup/first-admin`: only available before any local user exists and only after a successful Keycloak login

Current permission mapping:
- `admin`: `dashboard:view`, `links:manage`, `domains:manage`, `analytics:view`, `users:manage`
- `member`: `dashboard:view`, `links:manage`, `domains:manage`, `analytics:view`

Reserved Keycloak role names:
- `url-shortener-admin` maps to local `admin`
- `url-shortener-member` maps to local `member`
- if both are ever present in a future sync milestone, `admin` wins

## 1. Create the Realm

1. Open the Keycloak admin console for your self-hosted instance.
2. Create a realm named `startdoing`.
3. Keep that realm selected for the remaining steps.

## 2. Create the Client

1. Create a client with Client ID `url-shortener-management-web`.
2. Use OpenID Connect as the client type.
3. Enable the standard authorization code flow.
4. Enable client authentication so Keycloak issues a client secret.
5. Keep implicit flow disabled.
6. Save the client, then copy the generated client secret.

For newer Keycloak versions, the important settings are usually:
- `Client authentication`: On
- `Authorization`: Off
- `Standard flow`: On
- `Direct access grants`: Off

## 3. Configure Redirects and Origins

Add these values to the client.

For local development:
- Valid redirect URIs: `http://localhost:3000/auth/callback`
- Valid post logout redirect URIs: `http://localhost:3000/auth`
- Web origins: `http://localhost:3000`

For production, replace the host with your real management-web URL. If you keep the current example values from `.env.example`, add:
- Valid redirect URIs: `https://short.anh.pw/auth/callback`
- Valid post logout redirect URIs: `https://short.anh.pw/auth`
- Web origins: `https://short.anh.pw`

If your deployed management UI lives at a different host, use that host consistently for `APP_URL`, redirect URIs, and post-logout redirect URIs.

## 4. Create or Prepare Users

1. Create the user accounts that should access the dashboard.
2. Ensure each user has a non-empty email address.
3. Set a password or connect your normal upstream identity source.

Optional for later milestones:
- create realm roles or client roles named `url-shortener-admin` and `url-shortener-member`
- assign them in Keycloak now if you want your realm ready for a later sync milestone, but the current app version does not auto-apply them to existing local users

## 5. App Environment Variables

Set these for `management-web`:

```env
KEYCLOAK_URL=https://auth.startdo.ing
KEYCLOAK_REALM=startdoing
KEYCLOAK_CLIENT_ID=url-shortener-management-web
KEYCLOAK_CLIENT_SECRET=replace-with-client-secret
SESSION_SECRET=replace-with-a-random-string-at-least-32-characters-long
APP_URL=http://localhost:3000
DATABASE_PATH=../../dev.sqlite
```

Notes:
- `KEYCLOAK_URL` is the Keycloak base URL, not the realm URL.
- `APP_URL` must exactly match the browser URL you use to access `management-web`.
- `DATABASE_PATH` should point both apps at the same SQLite file during local development.

## 6. Local Development Commands

Apply migrations once:

```sh
cd packages/shared-db
DATABASE_PATH=../../dev.sqlite bun run migrate
```

Start `management-web` locally:

```sh
cd apps/management-web
DATABASE_PATH=../../dev.sqlite \
KEYCLOAK_URL=https://auth.startdo.ing \
KEYCLOAK_REALM=startdoing \
KEYCLOAK_CLIENT_ID=url-shortener-management-web \
KEYCLOAK_CLIENT_SECRET=replace-with-client-secret \
SESSION_SECRET=replace-with-a-random-string-at-least-32-characters-long \
APP_URL=http://localhost:3000 \
bun run dev
```

Then open `http://localhost:3000/auth` and use the Keycloak sign-in link.

## 7. Expected Login Flow

1. Open `/auth`.
2. Click `Sign in with Keycloak`.
3. Complete the Keycloak login screen.
4. Keycloak redirects back to `/auth/callback`.
5. If no local users exist yet, `management-web` redirects to `/setup/first-admin`.
6. Submitting that page creates the first local user with role `admin` and finishes the session login.
7. After bootstrap is complete, later Keycloak sign-ins create or update local users by `keycloak_sub` and redirect to `/dashboard`.

## 8. Troubleshooting

If `/auth` says configuration is incomplete:
- check every auth env var is set
- verify `SESSION_SECRET` is at least 32 characters
- verify `APP_URL` is an absolute URL

If Keycloak says the redirect URI is invalid:
- compare `APP_URL` with the exact browser URL you opened
- verify the callback path `/auth/callback` is present in the client redirect list

If login succeeds in Keycloak but the app rejects the callback:
- ensure the Keycloak user has an email address
- ensure `KEYCLOAK_CLIENT_SECRET` matches the current client secret

If the first login reaches `/setup/first-admin` but cannot complete:
- confirm the SQLite database is writable by `management-web`
- verify another local user was not already created in the same database file

If login works but the wrong user is linked locally:
- check for an existing row in `users` with the same email but a different `keycloak_sub`
- the current implementation rejects cross-linking one email to two different Keycloak subjects
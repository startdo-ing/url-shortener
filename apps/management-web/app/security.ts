import { createOIDCAuthProvider } from "remix/auth"
import { auth, createSessionAuthScheme } from "remix/auth-middleware"
import { createCookie } from "remix/cookie"
import type { Middleware, RequestContext } from "remix/fetch-router"
import { Auth, requireAuth } from "remix/auth-middleware"
import { Session } from "remix/session"
import { createFsSessionStorage } from "remix/session/fs-storage"
import { session } from "remix/session-middleware"

import { findViewerById, type Viewer } from "./models/user.ts"
import { routes } from "./routes.ts"

export const FLASH_ERROR_KEY = "authError"
export const FLASH_NOTICE_KEY = "authNotice"
export const KEYCLOAK_SESSION_KEY = "keycloak"
export const PENDING_BOOTSTRAP_KEY = "pendingBootstrap"
export const RETURN_TO_PARAM = "returnTo"
export const SESSION_AUTH_KEY = "auth"

export type AppPermission =
	| "analytics:view"
	| "dashboard:view"
	| "domains:manage"
	| "links:manage"
	| "users:manage"

export const ROLE_PERMISSIONS = {
	admin: [
		"analytics:view",
		"dashboard:view",
		"domains:manage",
		"links:manage",
		"users:manage"
	],
	member: ["analytics:view", "dashboard:view", "domains:manage", "links:manage"]
} as const satisfies Record<Viewer["role"], readonly AppPermission[]>

type KeycloakClaims = {
	sub: string
	email?: string
	name?: string
	preferred_username?: string
}

export interface KeycloakProfile {
	[key: string]: unknown
	sub: string
	email?: string
	displayName?: string
	username?: string
}

export interface PendingBootstrapState {
	subject: string
	email: string
	displayName: string | null
	returnTo?: string
}

interface AuthDiagnostics {
	appUrl: URL | null
	clientId: string | null
	configured: boolean
	errors: string[]
	issuer: string | null
	logoutRedirectUrl: string | null
}

const authDiagnostics = buildAuthDiagnostics()
const keycloakClientSecret = Bun.env.KEYCLOAK_CLIENT_SECRET?.trim() ?? null
const sessionSecret =
	Bun.env.SESSION_SECRET?.trim() ||
	`${crypto.randomUUID()}${crypto.randomUUID()}`

const sessionCookie = createCookie("__management_session", {
	secrets: [sessionSecret],
	httpOnly: true,
	path: "/",
	sameSite: "Lax",
	secure: authDiagnostics.appUrl?.protocol === "https:"
})

const sessionStoragePath =
	Bun.env.SESSION_STORAGE_PATH ??
	`${Bun.env.TMPDIR ?? "/tmp"}/url-shortener-management-web-sessions`

export const sessionMiddleware = session(
	sessionCookie,
	createFsSessionStorage(sessionStoragePath)
)

export const requestAuthMiddleware = auth({
	schemes: [
		createSessionAuthScheme<Viewer, { userId: string }>({
			read(session) {
				return (
					(session.get(SESSION_AUTH_KEY) as { userId: string } | undefined) ??
					null
				)
			},
			async verify(value) {
				const viewer = await findViewerById(value.userId)
				if (viewer == null || !viewer.isActive) {
					return null
				}

				return viewer
			},
			invalidate(session) {
				session.unset(SESSION_AUTH_KEY)
				if (session.has(KEYCLOAK_SESSION_KEY)) {
					session.unset(KEYCLOAK_SESSION_KEY)
				}
			}
		})
	]
})

const keycloakProviderOptions =
	authDiagnostics.configured &&
	authDiagnostics.issuer != null &&
	authDiagnostics.clientId != null &&
	authDiagnostics.appUrl != null &&
	keycloakClientSecret != null
		? {
				name: "keycloak" as const,
				issuer: authDiagnostics.issuer,
				clientId: authDiagnostics.clientId,
				clientSecret: keycloakClientSecret,
				redirectUri: new URL(
					routes.auth.callback.href(),
					authDiagnostics.appUrl
				),
				mapProfile({ claims }: { claims: KeycloakClaims }) {
					return {
						sub: claims.sub,
						email:
							typeof claims.email === "string"
								? claims.email.toLowerCase()
								: undefined,
						displayName:
							pickString(claims.name, claims.preferred_username) ?? undefined,
						username:
							typeof claims.preferred_username === "string"
								? claims.preferred_username
								: undefined
					}
				}
			}
		: null

export const keycloakProvider = keycloakProviderOptions
	? createOIDCAuthProvider<KeycloakProfile, "keycloak">(keycloakProviderOptions)
	: null

export function getAuthDiagnostics(): Readonly<AuthDiagnostics> {
	return authDiagnostics
}

export const requireSignedInViewer = requireAuth<Viewer>({
	onFailure(context) {
		const destination = new URL(routes.auth.index.href(), context.url)
		destination.searchParams.set(
			RETURN_TO_PARAM,
			`${context.url.pathname}${context.url.search}`
		)

		return Response.redirect(destination.toString(), 302)
	}
})

export const requireAdminViewer = requireViewerPermission(
	"users:manage",
	"Admin access required."
)

export function getViewer(context: RequestContext) {
	return (context.get(Auth) as { identity: Viewer }).identity
}

export function hasPermission(
	viewerOrRole: Pick<Viewer, "role"> | Viewer["role"],
	permission: AppPermission
) {
	const role =
		typeof viewerOrRole === "string" ? viewerOrRole : viewerOrRole.role
	const allowedPermissions: readonly AppPermission[] = ROLE_PERMISSIONS[role]

	return allowedPermissions.includes(permission)
}

export function getKeycloakLogoutUrl(idTokenHint?: string) {
	if (
		authDiagnostics.issuer == null ||
		authDiagnostics.logoutRedirectUrl == null
	) {
		return routes.auth.index.href()
	}

	const logoutUrl = new URL(
		"protocol/openid-connect/logout",
		ensureTrailingSlash(authDiagnostics.issuer)
	)
	logoutUrl.searchParams.set(
		"post_logout_redirect_uri",
		authDiagnostics.logoutRedirectUrl
	)

	if (authDiagnostics.clientId != null) {
		logoutUrl.searchParams.set("client_id", authDiagnostics.clientId)
	}

	if (idTokenHint) {
		logoutUrl.searchParams.set("id_token_hint", idTokenHint)
	}

	return logoutUrl.toString()
}

export function requireViewerPermission(
	permission: AppPermission,
	onFailureMessage: string
): Middleware {
	return async (context, next) => {
		const viewer = getViewer(context)
		if (hasPermission(viewer, permission)) {
			return next()
		}

		context.get(Session).flash(FLASH_ERROR_KEY, onFailureMessage)
		return Response.redirect(routes.dashboard.href(), 302)
	}
}

export function clearPendingBootstrap(session: Session) {
	if (session.has(PENDING_BOOTSTRAP_KEY)) {
		session.unset(PENDING_BOOTSTRAP_KEY)
	}
}

export function readPendingBootstrap(
	session: Session
): PendingBootstrapState | null {
	const value = session.get(PENDING_BOOTSTRAP_KEY)
	if (value == null || typeof value !== "object") {
		return null
	}

	const pending = value as Partial<PendingBootstrapState>
	if (
		typeof pending.subject !== "string" ||
		typeof pending.email !== "string"
	) {
		return null
	}

	return {
		subject: pending.subject,
		email: pending.email,
		displayName:
			typeof pending.displayName === "string" ? pending.displayName : null,
		returnTo:
			typeof pending.returnTo === "string" ? pending.returnTo : undefined
	}
}

function buildAuthDiagnostics(): AuthDiagnostics {
	const errors: string[] = []
	const appUrl = parseUrl(Bun.env.APP_URL?.trim(), "APP_URL", errors)
	const keycloakUrl = parseUrl(
		Bun.env.KEYCLOAK_URL?.trim(),
		"KEYCLOAK_URL",
		errors
	)
	const realm = requiredEnv("KEYCLOAK_REALM", errors)
	const clientId = requiredEnv("KEYCLOAK_CLIENT_ID", errors)
	const clientSecret = requiredEnv("KEYCLOAK_CLIENT_SECRET", errors)
	const rawSessionSecret = Bun.env.SESSION_SECRET?.trim()

	if (rawSessionSecret == null || rawSessionSecret.length < 32) {
		errors.push("SESSION_SECRET must be set to at least 32 characters")
	}

	const issuer =
		keycloakUrl && realm
			? new URL(
					`realms/${realm}`,
					ensureTrailingSlash(keycloakUrl.toString())
				).toString()
			: null
	const logoutRedirectUrl = appUrl
		? new URL(routes.auth.index.href(), appUrl).toString()
		: null

	return {
		appUrl,
		clientId,
		configured: errors.length === 0 && clientSecret != null,
		errors,
		issuer,
		logoutRedirectUrl
	}
}

function ensureTrailingSlash(value: string) {
	return value.endsWith("/") ? value : `${value}/`
}

function parseUrl(value: string | undefined, name: string, errors: string[]) {
	if (!value) {
		errors.push(`${name} is missing`)
		return null
	}

	try {
		return new URL(value)
	} catch {
		errors.push(`${name} must be a valid absolute URL`)
		return null
	}
}

function pickString(...values: unknown[]) {
	for (const value of values) {
		if (typeof value === "string" && value.trim().length > 0) {
			return value
		}
	}

	return null
}

function requiredEnv(name: string, errors: string[]) {
	const value = Bun.env[name]?.trim()
	if (!value) {
		errors.push(`${name} is missing`)
		return null
	}

	return value
}

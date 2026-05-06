export interface AuthDiagnostics {
	appUrl: URL | null
	clientId: string | null
	configured: boolean
	errors: string[]
	issuer: string | null
	logoutRedirectUrl: string | null
}

export interface AuthConfig {
	authEndpoint: string
	clientId: string
	clientSecret: string
	issuer: string
	redirectUri: string
	tokenEndpoint: string
	userinfoEndpoint: string
}

const authDiagnostics = buildAuthDiagnostics()

export function getAuthDiagnostics(): Readonly<AuthDiagnostics> {
	return authDiagnostics
}

export function getAuthConfig(): AuthConfig | null {
	const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET?.trim()
	if (
		!authDiagnostics.configured ||
		authDiagnostics.issuer == null ||
		authDiagnostics.clientId == null ||
		authDiagnostics.appUrl == null ||
		!clientSecret
	) {
		return null
	}

	const issuer = ensureTrailingSlash(authDiagnostics.issuer)
	const redirectUri = new URL(
		"/auth/callback",
		authDiagnostics.appUrl
	).toString()

	return {
		authEndpoint: new URL("protocol/openid-connect/auth", issuer).toString(),
		clientId: authDiagnostics.clientId,
		clientSecret,
		issuer: authDiagnostics.issuer,
		redirectUri,
		tokenEndpoint: new URL("protocol/openid-connect/token", issuer).toString(),
		userinfoEndpoint: new URL(
			"protocol/openid-connect/userinfo",
			issuer
		).toString()
	}
}

export function getKeycloakLogoutUrl(idTokenHint?: string) {
	if (
		authDiagnostics.issuer == null ||
		authDiagnostics.logoutRedirectUrl == null
	) {
		return "/auth"
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

function buildAuthDiagnostics(): AuthDiagnostics {
	const errors: string[] = []
	const appUrl = parseUrl(process.env.APP_URL?.trim(), "APP_URL", errors)
	const keycloakUrl = parseUrl(
		process.env.KEYCLOAK_URL?.trim(),
		"KEYCLOAK_URL",
		errors
	)
	const realm = requiredEnv("KEYCLOAK_REALM", errors)
	const clientId = requiredEnv("KEYCLOAK_CLIENT_ID", errors)
	const clientSecret = requiredEnv("KEYCLOAK_CLIENT_SECRET", errors)
	const rawSessionSecret = process.env.SESSION_SECRET?.trim()

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
	const logoutRedirectUrl = appUrl ? new URL("/auth", appUrl).toString() : null

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

function requiredEnv(name: string, errors: string[]) {
	const value = process.env[name]?.trim()
	if (!value) {
		errors.push(`${name} is missing`)
		return null
	}

	return value
}

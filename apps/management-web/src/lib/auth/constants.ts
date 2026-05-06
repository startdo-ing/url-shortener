export const FLASH_ERROR_KEY = "authError"
export const FLASH_NOTICE_KEY = "authNotice"
export const KEYCLOAK_SESSION_KEY = "keycloak"
export const OIDC_STATE_KEY = "oidc"
export const PENDING_BOOTSTRAP_KEY = "pendingBootstrap"
export const RETURN_TO_PARAM = "returnTo"
export const SESSION_AUTH_KEY = "auth"

export interface PendingBootstrapState {
	subject: string
	email: string
	displayName: string | null
	returnTo?: string
}

export interface SessionAuthState {
	userId: string
}

export interface KeycloakSessionState {
	idToken?: string
}

export interface OidcState {
	state: string
	codeVerifier: string
	returnTo?: string
}

export interface SessionState {
	auth?: SessionAuthState
	flashes?: Record<string, string>
	keycloak?: KeycloakSessionState
	oidc?: OidcState
	pendingBootstrap?: PendingBootstrapState
}

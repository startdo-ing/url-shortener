import { getAuthConfig } from "./config"

interface KeycloakProfile {
	sub: string
	email?: string
	name?: string
	preferred_username?: string
}

interface TokenResponse {
	access_token: string
	id_token?: string
}

export async function generatePkce(): Promise<{
	codeVerifier: string
	codeChallenge: string
}> {
	const verifierBytes = crypto.getRandomValues(new Uint8Array(32))
	const codeVerifier = btoa(String.fromCharCode(...verifierBytes))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "")

	const challengeBytes = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(codeVerifier)
	)
	const codeChallenge = btoa(
		String.fromCharCode(...new Uint8Array(challengeBytes))
	)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "")

	return { codeVerifier, codeChallenge }
}

export function buildAuthorizationUrl(state: string, codeChallenge: string) {
	const authConfig = getAuthConfig()
	if (authConfig == null) {
		return null
	}

	const loginUrl = new URL(authConfig.authEndpoint)
	loginUrl.searchParams.set("client_id", authConfig.clientId)
	loginUrl.searchParams.set("redirect_uri", authConfig.redirectUri)
	loginUrl.searchParams.set("response_type", "code")
	loginUrl.searchParams.set("scope", "openid profile email")
	loginUrl.searchParams.set("state", state)
	loginUrl.searchParams.set("code_challenge", codeChallenge)
	loginUrl.searchParams.set("code_challenge_method", "S256")

	return loginUrl.toString()
}

export async function exchangeCodeForProfile(
	code: string,
	codeVerifier: string
): Promise<{
	idToken?: string
	profile: KeycloakProfile
}> {
	const authConfig = getAuthConfig()
	if (authConfig == null) {
		throw new Error("Keycloak is not configured.")
	}

	const form = new URLSearchParams({
		grant_type: "authorization_code",
		code,
		redirect_uri: authConfig.redirectUri,
		client_id: authConfig.clientId,
		client_secret: authConfig.clientSecret,
		code_verifier: codeVerifier
	})

	const tokenResponse = await fetch(authConfig.tokenEndpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded"
		},
		body: form.toString()
	})

	if (!tokenResponse.ok) {
		throw new Error("Failed to exchange authorization code with Keycloak.")
	}

	const tokenPayload = (await tokenResponse.json()) as TokenResponse
	if (!tokenPayload.access_token) {
		throw new Error("Keycloak token response did not include an access token.")
	}

	const userinfoResponse = await fetch(authConfig.userinfoEndpoint, {
		headers: {
			Authorization: `Bearer ${tokenPayload.access_token}`
		}
	})

	if (!userinfoResponse.ok) {
		throw new Error("Failed to read Keycloak user profile.")
	}

	const profile = (await userinfoResponse.json()) as KeycloakProfile
	if (typeof profile.sub !== "string" || profile.sub.length === 0) {
		throw new Error("Keycloak profile is missing a valid subject.")
	}

	return {
		idToken: tokenPayload.id_token,
		profile
	}
}

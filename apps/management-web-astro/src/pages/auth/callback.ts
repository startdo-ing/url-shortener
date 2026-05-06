import type { APIRoute } from "astro"

import {
	FLASH_ERROR_KEY,
	FLASH_NOTICE_KEY,
	KEYCLOAK_SESSION_KEY,
	SESSION_AUTH_KEY
} from "../../lib/auth/constants"
import { getAuthConfig } from "../../lib/auth/config"
import { exchangeCodeForProfile } from "../../lib/auth/keycloak"
import {
	formatAuthError,
	missingConfigurationMessage
} from "../../lib/auth/messages"
import { flash, readSession, setSessionCookie } from "../../lib/auth/session"
import {
	countLocalUsers,
	upsertViewerFromKeycloak
} from "../../lib/models/user"

export const GET: APIRoute = async ({ request, url }) => {
	const session = readSession(request)
	const authConfig = getAuthConfig()

	if (authConfig == null) {
		flash(session, FLASH_ERROR_KEY, missingConfigurationMessage())
		return redirectWithSession("/auth", session)
	}

	const state = url.searchParams.get("state")
	const code = url.searchParams.get("code")
	const expectedState = session.oidc?.state
	const codeVerifier = session.oidc?.codeVerifier
	const returnTo = session.oidc?.returnTo

	if (
		!state ||
		!code ||
		!expectedState ||
		state !== expectedState ||
		!codeVerifier
	) {
		flash(
			session,
			FLASH_ERROR_KEY,
			"Invalid or expired login state. Please try again."
		)
		session.oidc = undefined
		return redirectWithSession("/auth", session)
	}

	try {
		const { idToken, profile } = await exchangeCodeForProfile(
			code,
			codeVerifier
		)
		if (profile.email == null) {
			flash(
				session,
				FLASH_ERROR_KEY,
				"Keycloak did not provide an email address for this account."
			)
			session.oidc = undefined
			return redirectWithSession("/auth", session)
		}

		const normalizedEmail = profile.email.toLowerCase()

		if ((await countLocalUsers()) === 0) {
			session.pendingBootstrap = {
				subject: profile.sub,
				email: normalizedEmail,
				displayName: profile.name ?? profile.preferred_username ?? null,
				returnTo: returnTo ?? undefined
			}
			flash(
				session,
				FLASH_NOTICE_KEY,
				"Complete setup to create the first local admin account."
			)
			if (idToken) {
				session[KEYCLOAK_SESSION_KEY] = { idToken }
			} else {
				session[KEYCLOAK_SESSION_KEY] = undefined
			}
			session[SESSION_AUTH_KEY] = undefined
			session.oidc = undefined
			return redirectWithSession("/setup/first-admin", session)
		}

		const viewer = await upsertViewerFromKeycloak({
			subject: profile.sub,
			email: normalizedEmail,
			displayName: profile.name ?? profile.preferred_username ?? null
		})

		if (!viewer.isActive) {
			flash(
				session,
				FLASH_ERROR_KEY,
				"This account exists locally but is marked inactive."
			)
			session.oidc = undefined
			return redirectWithSession("/auth", session)
		}

		session[SESSION_AUTH_KEY] = { userId: viewer.id }
		session.pendingBootstrap = undefined
		if (idToken) {
			session[KEYCLOAK_SESSION_KEY] = { idToken }
		} else {
			session[KEYCLOAK_SESSION_KEY] = undefined
		}
		session.oidc = undefined

		return redirectWithSession(returnTo ?? "/dashboard", session)
	} catch (error) {
		flash(session, FLASH_ERROR_KEY, formatAuthError(error))
		session.oidc = undefined
		return redirectWithSession("/auth", session)
	}
}

function redirectWithSession(
	target: string,
	session: ReturnType<typeof readSession>
) {
	return new Response(null, {
		status: 302,
		headers: {
			Location: target,
			"Set-Cookie": setSessionCookie(session)
		}
	})
}

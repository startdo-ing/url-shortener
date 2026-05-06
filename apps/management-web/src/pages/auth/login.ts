import type { APIRoute } from "astro"

import { RETURN_TO_PARAM } from "../../lib/auth/constants"
import { buildAuthorizationUrl, generatePkce } from "../../lib/auth/keycloak"
import { missingConfigurationMessage } from "../../lib/auth/messages"
import { flash, readSession, setSessionCookie } from "../../lib/auth/session"

export const GET: APIRoute = async ({ request, url }) => {
	const session = readSession(request)
	const state = crypto.randomUUID()
	const returnTo = url.searchParams.get(RETURN_TO_PARAM) ?? undefined
	const { codeVerifier, codeChallenge } = await generatePkce()
	const loginUrl = buildAuthorizationUrl(state, codeChallenge)

	if (loginUrl == null) {
		flash(session, "authError", missingConfigurationMessage())
		return redirectWithSession("/auth", session)
	}

	session.oidc = {
		state,
		codeVerifier,
		returnTo
	}

	return redirectWithSession(loginUrl, session)
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

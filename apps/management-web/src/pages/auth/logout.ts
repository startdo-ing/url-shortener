import type { APIRoute } from "astro"

import { getKeycloakLogoutUrl } from "../../lib/auth/config"
import { clearSessionCookie, readSession } from "../../lib/auth/session"

export const POST: APIRoute = ({ request }) => {
	const session = readSession(request)
	const logoutTarget = getKeycloakLogoutUrl(session.keycloak?.idToken)

	return new Response(null, {
		status: 302,
		headers: {
			Location: logoutTarget,
			"Set-Cookie": clearSessionCookie()
		}
	})
}

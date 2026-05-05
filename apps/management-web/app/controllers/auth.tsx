import { completeAuth, finishExternalAuth, startExternalAuth } from "remix/auth"
import { Auth } from "remix/auth-middleware"
import type { Controller } from "remix/fetch-router"
import { Session } from "remix/session"

import type { Viewer } from "../models/user.ts"
import { countLocalUsers, upsertViewerFromKeycloak } from "../models/user.ts"
import { routes } from "../routes.ts"
import {
	PENDING_BOOTSTRAP_KEY,
	FLASH_ERROR_KEY,
	FLASH_NOTICE_KEY,
	KEYCLOAK_SESSION_KEY,
	RETURN_TO_PARAM,
	SESSION_AUTH_KEY,
	clearPendingBootstrap,
	getAuthDiagnostics,
	getKeycloakLogoutUrl,
	keycloakProvider
} from "../security.ts"
import { AuthPage } from "../ui/auth-page.tsx"
import { render } from "../utils/render.tsx"

export const auth: Controller<typeof routes.auth> = {
	actions: {
		index: {
			handler(context) {
				const authState = context.get(Auth)
				const session = context.get(Session)
				const viewer = authState.ok ? (authState.identity as Viewer) : null
				const diagnostics = getAuthDiagnostics()

				return render(
					<AuthPage
						authConfigured={diagnostics.configured}
						authErrors={diagnostics.errors}
						errorMessage={readFlash(session, FLASH_ERROR_KEY)}
						issuer={diagnostics.issuer}
						loginHref={buildLoginHref(context.url)}
						noticeMessage={readFlash(session, FLASH_NOTICE_KEY)}
						viewer={viewer}
					/>,
					context.request
				)
			}
		},
		login: {
			async handler(context) {
				if (keycloakProvider == null) {
					context
						.get(Session)
						.flash(FLASH_ERROR_KEY, missingConfigurationMessage())

					return Response.redirect(routes.auth.index.href(), 302)
				}

				return startExternalAuth(keycloakProvider, context, {
					returnTo: context.url.searchParams.get(RETURN_TO_PARAM)
				})
			}
		},
		callback: {
			async handler(context) {
				const session = context.get(Session)

				if (keycloakProvider == null) {
					session.flash(FLASH_ERROR_KEY, missingConfigurationMessage())
					return Response.redirect(routes.auth.index.href(), 302)
				}

				try {
					const { result, returnTo } = await finishExternalAuth(
						keycloakProvider,
						context
					)

					if (result.profile.email == null) {
						session.flash(
							FLASH_ERROR_KEY,
							"Keycloak did not provide an email address for this account."
						)
						return Response.redirect(routes.auth.index.href(), 302)
					}

					if ((await countLocalUsers()) === 0) {
						const bootstrapSession = completeAuth(context)
						clearPendingBootstrap(bootstrapSession)
						bootstrapSession.set(PENDING_BOOTSTRAP_KEY, {
							subject: result.profile.sub,
							email: result.profile.email,
							displayName: result.profile.displayName ?? null,
							returnTo: returnTo ?? undefined
						})
						bootstrapSession.flash(
							FLASH_NOTICE_KEY,
							"Complete setup to create the first local admin account."
						)
						if (result.tokens.idToken) {
							bootstrapSession.set(KEYCLOAK_SESSION_KEY, {
								idToken: result.tokens.idToken
							})
						} else if (bootstrapSession.has(KEYCLOAK_SESSION_KEY)) {
							bootstrapSession.unset(KEYCLOAK_SESSION_KEY)
						}

						return Response.redirect(routes.bootstrap.index.href(), 302)
					}

					const viewer = await upsertViewerFromKeycloak({
						subject: result.profile.sub,
						email: result.profile.email,
						displayName: result.profile.displayName ?? null
					})
					if (!viewer.isActive) {
						session.flash(
							FLASH_ERROR_KEY,
							"This account exists locally but is marked inactive."
						)
						return Response.redirect(routes.auth.index.href(), 302)
					}

					const authenticatedSession = completeAuth(context)
					clearPendingBootstrap(authenticatedSession)
					authenticatedSession.set(SESSION_AUTH_KEY, { userId: viewer.id })
					if (result.tokens.idToken) {
						authenticatedSession.set(KEYCLOAK_SESSION_KEY, {
							idToken: result.tokens.idToken
						})
					} else if (authenticatedSession.has(KEYCLOAK_SESSION_KEY)) {
						authenticatedSession.unset(KEYCLOAK_SESSION_KEY)
					}

					const destination = returnTo ?? routes.dashboard.href()
					return Response.redirect(destination, 302)
				} catch (error) {
					session.flash(FLASH_ERROR_KEY, formatAuthError(error))
					return Response.redirect(routes.auth.index.href(), 302)
				}
			}
		},
		logout: {
			handler(context) {
				const session = context.get(Session)
				const keycloakSession = session.get(KEYCLOAK_SESSION_KEY) as
					| { idToken?: string }
					| undefined

				session.destroy()

				return Response.redirect(
					getKeycloakLogoutUrl(keycloakSession?.idToken),
					302
				)
			}
		}
	}
}

function buildLoginHref(requestUrl: URL) {
	const loginUrl = new URL(routes.auth.login.href(), requestUrl)
	const returnTo = requestUrl.searchParams.get(RETURN_TO_PARAM)

	if (returnTo) {
		loginUrl.searchParams.set(RETURN_TO_PARAM, returnTo)
	}

	return `${loginUrl.pathname}${loginUrl.search}`
}

function formatAuthError(error: unknown) {
	if (error instanceof Error && error.message.length > 0) {
		return error.message
	}

	return "Keycloak sign-in failed. Please try again."
}

function missingConfigurationMessage() {
	return `Keycloak is not configured: ${getAuthDiagnostics().errors.join("; ")}`
}

function readFlash(session: Session, key: string) {
	const value = session.get(key)
	return typeof value === "string" ? value : undefined
}

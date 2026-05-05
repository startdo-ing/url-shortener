import { completeAuth } from "remix/auth"
import type { Controller } from "remix/fetch-router"
import { Session } from "remix/session"

import {
	countLocalUsers,
	createFirstAdminFromKeycloak
} from "../models/user.ts"
import { routes } from "../routes.ts"
import {
	FLASH_ERROR_KEY,
	FLASH_NOTICE_KEY,
	SESSION_AUTH_KEY,
	clearPendingBootstrap,
	readPendingBootstrap
} from "../security.ts"
import { BootstrapPage } from "../ui/bootstrap-page.tsx"
import { render } from "../utils/render.tsx"

export const bootstrap: Controller<typeof routes.bootstrap> = {
	actions: {
		index: {
			async handler(context) {
				const session = context.get(Session)

				if ((await countLocalUsers()) > 0) {
					clearPendingBootstrap(session)
					return Response.redirect(routes.dashboard.href(), 302)
				}

				const pending = readPendingBootstrap(session)
				if (pending == null) {
					session.flash(
						FLASH_ERROR_KEY,
						"Sign in with Keycloak before claiming the first local admin account."
					)
					return Response.redirect(routes.auth.index.href(), 302)
				}

				return render(
					<BootstrapPage
						candidate={pending}
						errorMessage={readFlash(session, FLASH_ERROR_KEY)}
						noticeMessage={readFlash(session, FLASH_NOTICE_KEY)}
					/>,
					context.request
				)
			}
		},
		claim: {
			async handler(context) {
				const session = context.get(Session)

				if ((await countLocalUsers()) > 0) {
					clearPendingBootstrap(session)
					session.flash(
						FLASH_NOTICE_KEY,
						"First-admin setup has already been completed."
					)
					return Response.redirect(routes.dashboard.href(), 302)
				}

				const pending = readPendingBootstrap(session)
				if (pending == null) {
					session.flash(
						FLASH_ERROR_KEY,
						"Sign in with Keycloak before claiming the first local admin account."
					)
					return Response.redirect(routes.auth.index.href(), 302)
				}

				const viewer = await createFirstAdminFromKeycloak({
					subject: pending.subject,
					email: pending.email,
					displayName: pending.displayName
				})

				if (viewer == null) {
					clearPendingBootstrap(session)
					session.flash(
						FLASH_NOTICE_KEY,
						"First-admin setup has already been completed."
					)
					return Response.redirect(routes.dashboard.href(), 302)
				}

				const authenticatedSession = completeAuth(context)
				clearPendingBootstrap(authenticatedSession)
				authenticatedSession.set(SESSION_AUTH_KEY, { userId: viewer.id })
				authenticatedSession.flash(
					FLASH_NOTICE_KEY,
					`${viewer.email} is now the first local admin.`
				)

				return Response.redirect(
					pending.returnTo ?? routes.dashboard.href(),
					302
				)
			}
		}
	}
}

function readFlash(session: Session, key: string) {
	const value = session.get(key)
	return typeof value === "string" ? value : undefined
}

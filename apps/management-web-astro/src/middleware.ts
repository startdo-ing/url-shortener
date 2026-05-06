import { defineMiddleware } from "astro:middleware"

import {
	FLASH_ERROR_KEY,
	FLASH_NOTICE_KEY,
	KEYCLOAK_SESSION_KEY,
	RETURN_TO_PARAM,
	SESSION_AUTH_KEY,
	type SessionState
} from "./lib/auth/constants"
import { hasPermission } from "./lib/auth/permissions"
import { flash, readSession, redirectWithSession } from "./lib/auth/session"
import { handleDomainMutation } from "./lib/handlers/domains"
import { handleLinkMutation } from "./lib/handlers/links"
import { handleUserMutation } from "./lib/handlers/users"
import {
	countLocalUsers,
	createFirstAdminFromKeycloak,
	findViewerById,
	type Viewer
} from "./lib/models/user"
import { logger } from "./lib/observability/logger"
import { incrementCounter } from "./lib/observability/metrics"

const protectedPaths = new Set(["/dashboard", "/domains", "/links", "/users"])

export const onRequest = defineMiddleware(async (context, next) => {
	const { request, url } = context
	const startedAt = Date.now()

	let response: Response
	try {
		response = await routeRequest(context, next)
	} catch (error) {
		logger.error("unhandled error", {
			method: request.method,
			path: url.pathname,
			error: error instanceof Error ? error.message : String(error)
		})
		response = new Response("Internal Server Error", { status: 500 })
	}

	const durationMs = Date.now() - startedAt
	logger.info("request", {
		method: request.method,
		path: url.pathname,
		status: response.status,
		durationMs
	})
	incrementCounter("http_requests_total", {
		service: "management-web-astro",
		method: request.method,
		status: String(response.status)
	})

	return response
})

async function routeRequest(
	context: Parameters<Parameters<typeof defineMiddleware>[0]>[0],
	next: Parameters<Parameters<typeof defineMiddleware>[0]>[1]
) {
	const { request, url } = context
	const session = readSession(request)
	const pathname = url.pathname

	if (pathname === "/setup/first-admin") {
		if (request.method === "POST") {
			return handleFirstAdminClaim(session)
		}

		if (request.method === "GET") {
			if ((await countLocalUsers()) > 0) {
				session.pendingBootstrap = undefined
				return redirectWithSession("/dashboard", session)
			}

			if (session.pendingBootstrap == null) {
				flash(
					session,
					FLASH_ERROR_KEY,
					"Sign in with Keycloak before claiming the first local admin account."
				)
				return redirectWithSession("/auth", session)
			}
		}
	}

	if (!protectedPaths.has(pathname)) {
		return next()
	}

	const authState = session.auth
	if (authState == null) {
		return redirectToAuth(url, session)
	}

	const viewer = await findViewerById(authState.userId)
	if (viewer == null || !viewer.isActive) {
		session[SESSION_AUTH_KEY] = undefined
		session[KEYCLOAK_SESSION_KEY] = undefined
		return redirectToAuth(url, session)
	}

	if (pathname === "/users" && !hasPermission(viewer, "users:manage")) {
		flash(session, FLASH_ERROR_KEY, "Admin access required.")
		return redirectWithSession("/dashboard", session)
	}

	if (pathname === "/domains" && !hasPermission(viewer, "domains:manage")) {
		flash(
			session,
			FLASH_ERROR_KEY,
			"You do not have permission to manage domains."
		)
		return redirectWithSession("/dashboard", session)
	}

	if (pathname === "/links" && !hasPermission(viewer, "links:manage")) {
		flash(
			session,
			FLASH_ERROR_KEY,
			"You do not have permission to manage links."
		)
		return redirectWithSession("/dashboard", session)
	}

	if (pathname === "/users" && request.method === "POST") {
		return handleUserMutation(request, session, viewer)
	}

	if (pathname === "/domains" && request.method === "POST") {
		return handleDomainMutation(request, session, viewer)
	}

	if (pathname === "/links" && request.method === "POST") {
		return handleLinkMutation(request, session, viewer)
	}

	return next()
}

async function handleFirstAdminClaim(session: SessionState) {
	if ((await countLocalUsers()) > 0) {
		session.pendingBootstrap = undefined
		flash(
			session,
			FLASH_NOTICE_KEY,
			"First-admin setup has already been completed."
		)
		return redirectWithSession("/dashboard", session)
	}

	const pending = session.pendingBootstrap
	if (pending == null) {
		flash(
			session,
			FLASH_ERROR_KEY,
			"Sign in with Keycloak before claiming the first local admin account."
		)
		return redirectWithSession("/auth", session)
	}

	const viewer = await createFirstAdminFromKeycloak({
		subject: pending.subject,
		email: pending.email,
		displayName: pending.displayName
	})

	if (viewer == null) {
		session.pendingBootstrap = undefined
		flash(
			session,
			FLASH_NOTICE_KEY,
			"First-admin setup has already been completed."
		)
		return redirectWithSession("/dashboard", session)
	}

	session[SESSION_AUTH_KEY] = { userId: viewer.id }
	session.pendingBootstrap = undefined
	flash(
		session,
		FLASH_NOTICE_KEY,
		`${viewer.email} is now the first local admin.`
	)

	return redirectWithSession(pending.returnTo ?? "/dashboard", session)
}

function redirectToAuth(url: URL, session: SessionState) {
	const destination = new URL("/auth", url)
	destination.searchParams.set(RETURN_TO_PARAM, `${url.pathname}${url.search}`)
	return redirectWithSession(
		`${destination.pathname}${destination.search}`,
		session
	)
}

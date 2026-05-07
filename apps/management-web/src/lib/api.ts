import type { APIRoute } from "astro"

import { hasPermission, type AppPermission } from "./auth/permissions"
import { readSession } from "./auth/session"
import { authenticateApiToken } from "./models/api-token"
import { findViewerById } from "./models/user"
import type { Viewer } from "./models/user"

function readBearerToken(request: Request): string | null {
	const authorization = request.headers.get("authorization")
	if (!authorization) {
		return null
	}

	const [scheme, token] = authorization.split(" ")
	if (scheme !== "Bearer" || !token) {
		return null
	}

	return token.trim() || null
}

interface ApiAuthDependencies {
	authenticateApiTokenFn: (token: string) => Promise<Viewer | null>
	findViewerByIdFn: (id: string) => Promise<Viewer | null>
	hasPermissionFn: (
		viewerOrRole: Pick<Viewer, "role"> | Viewer["role"],
		permission: AppPermission
	) => boolean
	readSessionFn: (request: Request) => { auth?: { userId: string } }
	readTokenFn: (request: Request) => string | null
}

const defaultApiAuthDependencies: ApiAuthDependencies = {
	authenticateApiTokenFn: authenticateApiToken,
	findViewerByIdFn: findViewerById,
	hasPermissionFn: hasPermission,
	readSessionFn: readSession,
	readTokenFn: readBearerToken
}

export function createRequireApiViewer(
	dependencies: ApiAuthDependencies = defaultApiAuthDependencies
) {
	return async function requireApiViewer(
		request: Request,
		permission: AppPermission
	): Promise<{ viewerId: string } | Response> {
		const suppliedToken = dependencies.readTokenFn(request)

		if (suppliedToken) {
			const tokenViewer =
				await dependencies.authenticateApiTokenFn(suppliedToken)
			if (
				tokenViewer &&
				!dependencies.hasPermissionFn(tokenViewer, permission)
			) {
				return json({ error: "Forbidden" }, 403)
			}

			if (tokenViewer) {
				return { viewerId: tokenViewer.id }
			}
		}

		const session = dependencies.readSessionFn(request)
		const userId = session.auth?.userId
		if (!userId) {
			return json({ error: "Unauthorized" }, 401)
		}

		const viewer = await dependencies.findViewerByIdFn(userId)
		if (!viewer || !viewer.isActive) {
			return json({ error: "Unauthorized" }, 401)
		}

		if (!dependencies.hasPermissionFn(viewer, permission)) {
			return json({ error: "Forbidden" }, 403)
		}

		return { viewerId: viewer.id }
	}
}

export const requireApiViewer = createRequireApiViewer()

export function json(payload: unknown, status = 200): Response {
	return Response.json(payload, { status })
}

export async function readJsonBody(
	request: Request
): Promise<Record<string, unknown> | Response> {
	try {
		const body = (await request.json()) as unknown
		if (body == null || typeof body !== "object" || Array.isArray(body)) {
			return json({ error: "Body must be a JSON object." }, 400)
		}

		return body as Record<string, unknown>
	} catch {
		return json({ error: "Invalid JSON body." }, 400)
	}
}

export type ApiRoute = APIRoute

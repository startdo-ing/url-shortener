import type { APIRoute } from "astro"

import { hasPermission, type AppPermission } from "./auth/permissions"
import { readSession } from "./auth/session"
import { findFirstActiveAdmin, findViewerById } from "./models/user"
import type { Viewer } from "./models/user"

function getApiToken(): string | null {
	const token = process.env.MANAGEMENT_API_TOKEN?.trim()
	return token && token.length > 0 ? token : null
}

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
	findFirstActiveAdminFn: () => Promise<Viewer | null>
	findViewerByIdFn: (id: string) => Promise<Viewer | null>
	hasPermissionFn: (
		viewerOrRole: Pick<Viewer, "role"> | Viewer["role"],
		permission: AppPermission
	) => boolean
	readSessionFn: (request: Request) => { auth?: { userId: string } }
	readTokenFn: (request: Request) => string | null
	resolveApiTokenFn: () => string | null
}

const defaultApiAuthDependencies: ApiAuthDependencies = {
	findFirstActiveAdminFn: findFirstActiveAdmin,
	findViewerByIdFn: findViewerById,
	hasPermissionFn: hasPermission,
	readSessionFn: readSession,
	readTokenFn: readBearerToken,
	resolveApiTokenFn: getApiToken
}

export function createRequireApiViewer(
	dependencies: ApiAuthDependencies = defaultApiAuthDependencies
) {
	return async function requireApiViewer(
		request: Request,
		permission: AppPermission
	): Promise<{ viewerId: string } | Response> {
		const configuredToken = dependencies.resolveApiTokenFn()
		const suppliedToken = dependencies.readTokenFn(request)

		if (configuredToken && suppliedToken === configuredToken) {
			const adminViewer = await dependencies.findFirstActiveAdminFn()
			if (!adminViewer) {
				return json(
					{
						error:
							"API token is configured but no active admin user is available."
					},
					503
				)
			}

			if (!dependencies.hasPermissionFn(adminViewer, permission)) {
				return json({ error: "Forbidden" }, 403)
			}

			return { viewerId: adminViewer.id }
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

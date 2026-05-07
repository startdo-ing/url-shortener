import {
	deleteLink,
	getLinkById,
	updateLink,
	type ManagedShortLink,
	type ShortLinkInput
} from "../../../lib/models/link"
import {
	json,
	readJsonBody,
	requireApiViewer,
	type ApiRoute
} from "../../../lib/api"

interface LinkItemDependencies {
	deleteLinkFn: typeof deleteLink
	getLinkByIdFn: typeof getLinkById
	readJsonBodyFn: typeof readJsonBody
	requireApiViewerFn: typeof requireApiViewer
	updateLinkFn: typeof updateLink
}

const defaultLinkItemDependencies: LinkItemDependencies = {
	deleteLinkFn: deleteLink,
	getLinkByIdFn: getLinkById,
	readJsonBodyFn: readJsonBody,
	requireApiViewerFn: requireApiViewer,
	updateLinkFn: updateLink
}

function toInput(body: Record<string, unknown>): ShortLinkInput {
	return {
		domainId: String(body.domainId ?? ""),
		expiresAt: body.expiresAt == null ? undefined : String(body.expiresAt),
		httpCode: body.httpCode == null ? undefined : Number(body.httpCode),
		password: body.password == null ? undefined : String(body.password),
		slug: String(body.slug ?? ""),
		status:
			body.status === "active" || body.status === "disabled"
				? body.status
				: undefined,
		targetUrl: String(body.targetUrl ?? "")
	}
}

function toPublicLink(link: ManagedShortLink) {
	const { passwordHash: _passwordHash, ...rest } = link
	return {
		...rest,
		isPasswordProtected: link.passwordHash != null
	}
}

export function createLinkItemHandlers(
	dependencies: LinkItemDependencies = defaultLinkItemDependencies
) {
	const GET: ApiRoute = async ({ request, params }) => {
		const auth = await dependencies.requireApiViewerFn(request, "links:manage")
		if (auth instanceof Response) {
			return auth
		}

		const id = params.id
		if (!id) {
			return json({ error: "Missing id." }, 400)
		}

		const link = await dependencies.getLinkByIdFn(id)
		if (!link) {
			return json({ error: "Not Found" }, 404)
		}

		return json(toPublicLink(link))
	}

	const PATCH: ApiRoute = async ({ request, params }) => {
		const auth = await dependencies.requireApiViewerFn(request, "links:manage")
		if (auth instanceof Response) {
			return auth
		}

		const id = params.id
		if (!id) {
			return json({ error: "Missing id." }, 400)
		}

		const body = await dependencies.readJsonBodyFn(request)
		if (body instanceof Response) {
			return body
		}

		try {
			const updated = await dependencies.updateLinkFn(id, toInput(body))
			return json(toPublicLink(updated))
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to update link."
			return json(
				{ error: message },
				message === "Short link not found." ? 404 : 400
			)
		}
	}

	const DELETE: ApiRoute = async ({ request, params }) => {
		const auth = await dependencies.requireApiViewerFn(request, "links:manage")
		if (auth instanceof Response) {
			return auth
		}

		const id = params.id
		if (!id) {
			return json({ error: "Missing id." }, 400)
		}

		try {
			await dependencies.deleteLinkFn(id)
			return new Response(null, { status: 204 })
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to delete link."
			return json(
				{ error: message },
				message === "Short link not found." ? 404 : 400
			)
		}
	}

	return { DELETE, GET, PATCH }
}

const handlers = createLinkItemHandlers()

export const GET = handlers.GET
export const PATCH = handlers.PATCH
export const DELETE = handlers.DELETE

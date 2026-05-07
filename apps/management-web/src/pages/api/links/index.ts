import {
	createLink,
	listLinks,
	type ManagedShortLink,
	type ShortLinkInput
} from "../../../lib/models/link"
import {
	json,
	readJsonBody,
	requireApiViewer,
	type ApiRoute
} from "../../../lib/api"

interface LinksCollectionDependencies {
	createLinkFn: typeof createLink
	listLinksFn: typeof listLinks
	readJsonBodyFn: typeof readJsonBody
	requireApiViewerFn: typeof requireApiViewer
}

const defaultLinksCollectionDependencies: LinksCollectionDependencies = {
	createLinkFn: createLink,
	listLinksFn: listLinks,
	readJsonBodyFn: readJsonBody,
	requireApiViewerFn: requireApiViewer
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

export function createLinksCollectionHandlers(
	dependencies: LinksCollectionDependencies = defaultLinksCollectionDependencies
) {
	const GET: ApiRoute = async ({ request, url }) => {
		const auth = await dependencies.requireApiViewerFn(request, "links:manage")
		if (auth instanceof Response) {
			return auth
		}

		const status = url.searchParams.get("status")
		const query = url.searchParams.get("query")?.trim() || undefined
		const domainId = url.searchParams.get("domainId")?.trim() || undefined
		const links = await dependencies.listLinksFn({
			domainId,
			query,
			status: status === "active" || status === "disabled" ? status : undefined
		})

		return json({ items: links.map(toPublicLink) })
	}

	const POST: ApiRoute = async ({ request }) => {
		const auth = await dependencies.requireApiViewerFn(request, "links:manage")
		if (auth instanceof Response) {
			return auth
		}

		const body = await dependencies.readJsonBodyFn(request)
		if (body instanceof Response) {
			return body
		}

		try {
			const created = await dependencies.createLinkFn(
				toInput(body),
				auth.viewerId
			)
			return json(toPublicLink(created), 201)
		} catch (error) {
			return json(
				{
					error:
						error instanceof Error ? error.message : "Failed to create link."
				},
				400
			)
		}
	}

	return { GET, POST }
}

const handlers = createLinksCollectionHandlers()

export const GET = handlers.GET
export const POST = handlers.POST

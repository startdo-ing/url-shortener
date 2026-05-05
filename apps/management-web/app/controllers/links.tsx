import type { Controller } from "remix/fetch-router"
import { Session } from "remix/session"

import type { Viewer } from "../models/user.ts"
import {
	createLink,
	deleteLink,
	listLinkDomains,
	listLinks,
	type ShortLinkInput,
	updateLink,
	type LinkFilters,
	type ManagedShortLink
} from "../models/link.ts"
import { routes } from "../routes.ts"
import {
	FLASH_ERROR_KEY,
	FLASH_NOTICE_KEY,
	getViewer,
	requireSignedInViewer,
	requireViewerPermission
} from "../security.ts"
import { LinksPage } from "../ui/links-page.tsx"
import { render } from "../utils/render.tsx"

const requireLinkManager = requireViewerPermission(
	"links:manage",
	"Link management access required."
)

export const linkManagement: Controller<typeof routes.links> = {
	middleware: [requireSignedInViewer, requireLinkManager],
	actions: {
		index: {
			async handler(context) {
				const viewer = getViewer(context) as Viewer
				const filters = readFilters(context.url)
				const [domains, links] = await Promise.all([
					listLinkDomains(),
					listLinks(filters)
				])
				const session = context.get(Session)

				return render(
					<LinksPage
						domains={domains}
						errorMessage={readFlash(session, FLASH_ERROR_KEY)}
						filters={filters}
						links={links}
						noticeMessage={readFlash(session, FLASH_NOTICE_KEY)}
						viewer={viewer}
					/>,
					context.request
				)
			}
		},
		mutate: {
			async handler(context) {
				const viewer = getViewer(context) as Viewer
				const session = context.get(Session)
				const formData = await context.request.formData()
				const intent = String(formData.get("intent") ?? "")

				try {
					switch (intent) {
						case "create": {
							const created = await createLink(
								readLinkInput(formData),
								viewer.id
							)
							session.flash(
								FLASH_NOTICE_KEY,
								`Created ${buildLinkLabel(created)}.`
							)
							break
						}
						case "update": {
							const linkId = readRequiredValue(formData, "linkId")
							const updated = await updateLink(linkId, readLinkInput(formData))
							session.flash(
								FLASH_NOTICE_KEY,
								`Updated ${buildLinkLabel(updated)}.`
							)
							break
						}
						case "delete": {
							const linkId = readRequiredValue(formData, "linkId")
							const label = String(formData.get("label") ?? "short link")
							await deleteLink(linkId)
							session.flash(FLASH_NOTICE_KEY, `Deleted ${label}.`)
							break
						}
						default:
							throw new Error("Unknown short-link action.")
					}
				} catch (error) {
					session.flash(FLASH_ERROR_KEY, formatError(error))
				}

				return Response.redirect(routes.links.index.href(), 302)
			}
		}
	}
}

function buildLinkLabel(link: ManagedShortLink) {
	return `${link.domainHost}/${link.slug}`
}

function formatError(error: unknown) {
	if (error instanceof Error && error.message.length > 0) {
		return error.message
	}

	return "Short-link action failed."
}

function readFilters(url: URL): LinkFilters {
	const status = url.searchParams.get("status")
	return {
		domainId: readOptionalValue(url.searchParams.get("domainId")),
		query: readOptionalValue(url.searchParams.get("query")),
		status: status === "active" || status === "disabled" ? status : undefined
	}
}

function readLinkInput(formData: FormData) {
	const status = String(formData.get("status") ?? "active")
	return {
		domainId: readRequiredValue(formData, "domainId"),
		expiresAt: readOptionalValue(formData.get("expiresAt")),
		httpCode: Number(formData.get("httpCode") ?? 302),
		slug: readRequiredValue(formData, "slug"),
		status: status === "disabled" ? "disabled" : "active",
		targetUrl: readRequiredValue(formData, "targetUrl")
	} satisfies ShortLinkInput
}

function readFlash(session: Session, key: string) {
	const value = session.get(key)
	return typeof value === "string" ? value : undefined
}

function readOptionalValue(value: FormDataEntryValue | string | null) {
	if (typeof value !== "string") {
		return undefined
	}

	const trimmed = value.trim()
	return trimmed.length > 0 ? trimmed : undefined
}

function readRequiredValue(formData: FormData, key: string) {
	const value = readOptionalValue(formData.get(key))
	if (value == null) {
		throw new Error(`Missing ${key}.`)
	}

	return value
}

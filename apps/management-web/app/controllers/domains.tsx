import type { Controller } from "remix/fetch-router"
import { Session } from "remix/session"

import type { Viewer } from "../models/user.ts"
import {
	createDomain,
	deleteDomain,
	listDomains,
	setDomainActive,
	setPrimaryDomain,
	verifyDomainDns,
	type ManagedDomain
} from "../models/domain.ts"
import { routes } from "../routes.ts"
import {
	FLASH_ERROR_KEY,
	FLASH_NOTICE_KEY,
	getViewer,
	requireSignedInViewer,
	requireViewerPermission
} from "../security.ts"
import { DomainsPage } from "../ui/domains-page.tsx"
import { render } from "../utils/render.tsx"

const requireDomainManager = requireViewerPermission(
	"domains:manage",
	"Domain management access required."
)

export const domainManagement: Controller<typeof routes.domains> = {
	middleware: [requireSignedInViewer, requireDomainManager],
	actions: {
		index: {
			async handler(context) {
				const viewer = getViewer(context) as Viewer
				const session = context.get(Session)
				const domains = await listDomains()

				return render(
					<DomainsPage
						domains={domains}
						errorMessage={readFlash(session, FLASH_ERROR_KEY)}
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
							const created = await createDomain(
								readRequiredValue(formData, "host"),
								viewer.id
							)
							session.flash(FLASH_NOTICE_KEY, `Added ${created.host}.`)
							break
						}
						case "verify": {
							const domainId = readRequiredValue(formData, "domainId")
							const verified = await verifyDomainDns(domainId)
							session.flash(
								FLASH_NOTICE_KEY,
								verified.verificationStatus === "verified"
									? `Verified ${verified.host}.`
									: `DNS verification failed for ${verified.host}.`
							)
							break
						}
						case "enable":
						case "disable": {
							const domainId = readRequiredValue(formData, "domainId")
							const updated = await setDomainActive(
								domainId,
								intent === "enable"
							)
							session.flash(
								FLASH_NOTICE_KEY,
								`${updated.host} is now ${updated.isActive ? "active" : "disabled"}.`
							)
							break
						}
						case "delete": {
							const domainId = readRequiredValue(formData, "domainId")
							const label = readRequiredValue(formData, "label")
							await deleteDomain(domainId)
							session.flash(FLASH_NOTICE_KEY, `Deleted ${label}.`)
							break
						}
						case "set-primary": {
							const domainId = readRequiredValue(formData, "domainId")
							const updated = await setPrimaryDomain(domainId)
							session.flash(
								FLASH_NOTICE_KEY,
								`${updated.host} is now the primary domain.`
							)
							break
						}
						default:
							throw new Error("Unknown domain action.")
					}
				} catch (error) {
					session.flash(FLASH_ERROR_KEY, formatError(error))
				}

				return Response.redirect(routes.domains.index.href(), 302)
			}
		}
	}
}

function formatError(error: unknown) {
	if (error instanceof Error && error.message.length > 0) {
		return error.message
	}

	return "Domain action failed."
}

function readFlash(session: Session, key: string) {
	const value = session.get(key)
	return typeof value === "string" ? value : undefined
}

function readRequiredValue(formData: FormData, key: string) {
	const value = formData.get(key)
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new Error(`Missing ${key}.`)
	}

	return value.trim()
}

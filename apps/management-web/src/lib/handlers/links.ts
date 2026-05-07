import {
	FLASH_ERROR_KEY,
	FLASH_NOTICE_KEY,
	type SessionState
} from "../auth/constants"
import { flash, redirectWithSession } from "../auth/session"
import {
	createLink,
	deleteLink,
	formatShortLinkUrl,
	updateLink,
	type ShortLinkInput
} from "../models/link"
import type { Viewer } from "../models/user"
import { readOptionalValue, readRequiredValue } from "./form"

export async function handleLinkMutation(
	request: Request,
	session: SessionState,
	viewer: Viewer
): Promise<Response> {
	const formData = await request.formData()
	const intent = String(formData.get("intent") ?? "")

	try {
		switch (intent) {
			case "create": {
				const created = await createLink(readLinkInput(formData), viewer.id)
				flash(
					session,
					FLASH_NOTICE_KEY,
					`Created ${formatShortLinkUrl(created.domainHost, created.slug)}.`
				)
				break
			}
			case "update": {
				const linkId = readRequiredValue(formData, "linkId")
				const updated = await updateLink(linkId, readLinkInput(formData))
				flash(
					session,
					FLASH_NOTICE_KEY,
					`Updated ${formatShortLinkUrl(updated.domainHost, updated.slug)}.`
				)
				break
			}
			case "delete": {
				const linkId = readRequiredValue(formData, "linkId")
				const label = readOptionalValue(formData.get("label")) ?? "short link"
				await deleteLink(linkId)
				flash(session, FLASH_NOTICE_KEY, `Deleted ${label}.`)
				break
			}
			default:
				throw new Error("Unknown short-link action.")
		}
	} catch (error) {
		flash(
			session,
			FLASH_ERROR_KEY,
			error instanceof Error && error.message.length > 0
				? error.message
				: "Short-link action failed."
		)
	}

	return redirectWithSession("/links", session)
}

function readLinkInput(formData: FormData): ShortLinkInput {
	const status = String(formData.get("status") ?? "active")

	return {
		domainId: readRequiredValue(formData, "domainId"),
		expiresAt: readOptionalValue(formData.get("expiresAt")),
		httpCode: Number(formData.get("httpCode") ?? 302),
		password: readOptionalValue(formData.get("password")),
		slug: readRequiredValue(formData, "slug"),
		status: status === "disabled" ? "disabled" : "active",
		targetUrl: readRequiredValue(formData, "targetUrl")
	}
}

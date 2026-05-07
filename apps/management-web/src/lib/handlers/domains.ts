import {
	FLASH_ERROR_KEY,
	FLASH_NOTICE_KEY,
	type SessionState
} from "../auth/constants"
import { flash, redirectWithSession } from "../auth/session"
import {
	createDomain,
	deleteDomain,
	setDomainActive,
	setPrimaryDomain,
	verifyDomainDns
} from "../models/domain"
import type { Viewer } from "../models/user"
import { readRequiredValue } from "./form"

export async function handleDomainMutation(
	request: Request,
	session: SessionState,
	viewer: Viewer
): Promise<Response> {
	const formData = await request.formData()
	const intent = String(formData.get("intent") ?? "")
	const allowLocalhost = shouldAllowLocalhostDomain(request.url)

	try {
		switch (intent) {
			case "create": {
				const created = await createDomain(
					readRequiredValue(formData, "host"),
					viewer.id,
					{ allowLocalhost }
				)
				flash(session, FLASH_NOTICE_KEY, `Added ${created.host}.`)
				break
			}
			case "verify": {
				const domainId = readRequiredValue(formData, "domainId")
				const verified = await verifyDomainDns(domainId)
				flash(
					session,
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
				const updated = await setDomainActive(domainId, intent === "enable")
				flash(
					session,
					FLASH_NOTICE_KEY,
					`${updated.host} is now ${updated.isActive ? "active" : "disabled"}.`
				)
				break
			}
			case "delete": {
				const domainId = readRequiredValue(formData, "domainId")
				const label = readRequiredValue(formData, "label")
				await deleteDomain(domainId)
				flash(session, FLASH_NOTICE_KEY, `Deleted ${label}.`)
				break
			}
			case "set-primary": {
				const domainId = readRequiredValue(formData, "domainId")
				const updated = await setPrimaryDomain(domainId)
				flash(
					session,
					FLASH_NOTICE_KEY,
					`${updated.host} is now the primary domain.`
				)
				break
			}
			default:
				throw new Error("Unknown domain action.")
		}
	} catch (error) {
		flash(
			session,
			FLASH_ERROR_KEY,
			error instanceof Error && error.message.length > 0
				? error.message
				: "Domain action failed."
		)
	}

	return redirectWithSession("/domains", session)
}

function shouldAllowLocalhostDomain(requestUrl: string) {
	try {
		const url = new URL(requestUrl)
		const host = url.hostname.toLowerCase()
		const isLocalHost =
			host === "localhost" || host === "127.0.0.1" || host === "::1"
		return isLocalHost && url.pathname === "/domains"
	} catch {
		return false
	}
}

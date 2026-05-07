import {
	FLASH_ERROR_KEY,
	FLASH_NOTICE_KEY,
	type SessionState
} from "../auth/constants"
import { flash, redirectWithSession } from "../auth/session"
import {
	createApiToken,
	removeApiToken,
	rotateApiToken
} from "../models/api-token"
import { updateUser, type Viewer } from "../models/user"
import { readRequiredValue } from "./form"

export async function handleUserMutation(
	request: Request,
	session: SessionState,
	viewer: Viewer
): Promise<Response> {
	const formData = await request.formData()
	const intent = String(formData.get("intent") ?? "")

	if (isApiTokenIntent(intent)) {
		return handleApiTokenMutation(formData, session, viewer)
	}

	const userId = String(formData.get("userId") ?? "")

	if (!userId || !intent) {
		flash(session, FLASH_ERROR_KEY, "Invalid user-management request.")
		return redirectWithSession("/users", session)
	}

	try {
		const updatedUser = await performUserAction(intent, userId, viewer.id)
		flash(session, FLASH_NOTICE_KEY, buildSuccessMessage(intent, updatedUser))
	} catch (error) {
		flash(
			session,
			FLASH_ERROR_KEY,
			error instanceof Error && error.message.length > 0
				? error.message
				: "User management action failed."
		)
	}

	return redirectWithSession("/users", session)
}

async function handleApiTokenMutation(
	formData: FormData,
	session: SessionState,
	viewer: Viewer
): Promise<Response> {
	try {
		switch (String(formData.get("intent") ?? "")) {
			case "api-token-create": {
				const name = readRequiredValue(formData, "name")
				const created = await createApiToken(name, viewer.id)
				flash(
					session,
					FLASH_NOTICE_KEY,
					`Created API token ${created.record.name}. Copy it now: ${created.token}`
				)
				break
			}
			case "api-token-rotate": {
				const tokenId = readRequiredValue(formData, "tokenId")
				const rotated = await rotateApiToken(tokenId, viewer.id)
				flash(
					session,
					FLASH_NOTICE_KEY,
					`Rotated API token ${rotated.record.name}. Copy it now: ${rotated.token}`
				)
				break
			}
			case "api-token-remove": {
				const tokenId = readRequiredValue(formData, "tokenId")
				const removed = await removeApiToken(tokenId)
				flash(session, FLASH_NOTICE_KEY, `Removed API token ${removed.name}.`)
				break
			}
			default:
				throw new Error("Unknown API-token action.")
		}
	} catch (error) {
		flash(
			session,
			FLASH_ERROR_KEY,
			error instanceof Error && error.message.length > 0
				? error.message
				: "API-token action failed."
		)
	}

	return redirectWithSession("/users", session)
}

async function performUserAction(
	intent: string,
	userId: string,
	actorUserId: string
) {
	switch (intent) {
		case "promote":
			return updateUser({ role: "admin", userId }, actorUserId)
		case "demote":
			return updateUser({ role: "member", userId }, actorUserId)
		case "enable":
			return updateUser({ active: true, userId }, actorUserId)
		case "disable":
			return updateUser({ active: false, userId }, actorUserId)
		default:
			throw new Error("Unknown user-management action.")
	}
}

function buildSuccessMessage(intent: string, updatedUser: Viewer) {
	switch (intent) {
		case "promote":
			return `${updatedUser.email} is now an admin.`
		case "demote":
			return `${updatedUser.email} is now a member.`
		case "enable":
			return `${updatedUser.email} access has been enabled.`
		case "disable":
			return `${updatedUser.email} access has been disabled.`
		default:
			return `${updatedUser.email} has been updated.`
	}
}

function isApiTokenIntent(intent: string) {
	return ["api-token-create", "api-token-remove", "api-token-rotate"].includes(
		intent
	)
}

import {
	FLASH_ERROR_KEY,
	FLASH_NOTICE_KEY,
	type SessionState
} from "../auth/constants"
import { flash, redirectWithSession } from "../auth/session"
import { updateUser, type Viewer } from "../models/user"
import { readRequiredValue } from "./form"

export async function handleUserMutation(
	request: Request,
	session: SessionState,
	viewer: Viewer
): Promise<Response> {
	const formData = await request.formData()
	const userId = String(formData.get("userId") ?? "")
	const intent = String(formData.get("intent") ?? "")

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

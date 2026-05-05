import type { Controller } from "remix/fetch-router"
import { Session } from "remix/session"

import type { Viewer } from "../models/user.ts"
import { listUsers, updateUser } from "../models/user.ts"
import { routes } from "../routes.ts"
import {
	FLASH_ERROR_KEY,
	FLASH_NOTICE_KEY,
	getViewer,
	requireAdminViewer,
	requireSignedInViewer
} from "../security.ts"
import { UsersPage } from "../ui/users-page.tsx"
import { render } from "../utils/render.tsx"

export const userManagement: Controller<typeof routes.users> = {
	middleware: [requireSignedInViewer, requireAdminViewer],
	actions: {
		index: {
			async handler(context) {
				const viewer = getViewer(context) as Viewer
				const users = await listUsers()
				const activeAdminCount = users.filter(
					(user) => user.role === "admin" && user.isActive
				).length

				return render(
					<UsersPage
						activeAdminCount={activeAdminCount}
						errorMessage={readFlash(context.get(Session), FLASH_ERROR_KEY)}
						noticeMessage={readFlash(context.get(Session), FLASH_NOTICE_KEY)}
						users={users}
						viewer={viewer}
					/>,
					context.request
				)
			}
		},
		update: {
			async handler(context) {
				const viewer = getViewer(context) as Viewer
				const session = context.get(Session)
				const formData = await context.request.formData()
				const userId = String(formData.get("userId") ?? "")
				const intent = String(formData.get("intent") ?? "")

				if (!userId || !intent) {
					session.flash(FLASH_ERROR_KEY, "Invalid user-management request.")
					return Response.redirect(routes.users.index.href(), 302)
				}

				try {
					const updatedUser = await performUserAction(intent, userId, viewer.id)
					session.flash(
						FLASH_NOTICE_KEY,
						buildSuccessMessage(intent, updatedUser)
					)
				} catch (error) {
					session.flash(FLASH_ERROR_KEY, formatError(error))
				}

				return Response.redirect(routes.users.index.href(), 302)
			}
		}
	}
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

function buildSuccessMessage(intent: string, viewer: Viewer) {
	switch (intent) {
		case "promote":
			return `${viewer.email} is now an admin.`
		case "demote":
			return `${viewer.email} is now a member.`
		case "enable":
			return `${viewer.email} access has been enabled.`
		case "disable":
			return `${viewer.email} access has been disabled.`
		default:
			return `${viewer.email} has been updated.`
	}
}

function formatError(error: unknown) {
	if (error instanceof Error && error.message.length > 0) {
		return error.message
	}

	return "User management action failed."
}

function readFlash(session: Session, key: string) {
	const value = session.get(key)
	return typeof value === "string" ? value : undefined
}

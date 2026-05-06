import type { Viewer } from "../models/user"

export type AppPermission =
	| "analytics:view"
	| "dashboard:view"
	| "domains:manage"
	| "links:manage"
	| "users:manage"

export const ROLE_PERMISSIONS = {
	admin: [
		"analytics:view",
		"dashboard:view",
		"domains:manage",
		"links:manage",
		"users:manage"
	],
	member: ["analytics:view", "dashboard:view", "domains:manage", "links:manage"]
} as const satisfies Record<Viewer["role"], readonly AppPermission[]>

export function hasPermission(
	viewerOrRole: Pick<Viewer, "role"> | Viewer["role"],
	permission: AppPermission
) {
	const role =
		typeof viewerOrRole === "string" ? viewerOrRole : viewerOrRole.role
	const permissions: readonly AppPermission[] = ROLE_PERMISSIONS[role]
	return permissions.includes(permission)
}

import type { Viewer } from "../models/user.ts"
import { routes } from "../routes.ts"
import { Layout } from "./layout.tsx"

export interface UsersPageProps {
	activeAdminCount: number
	errorMessage?: string
	noticeMessage?: string
	users: Viewer[]
	viewer: Viewer
}

export function UsersPage() {
	return ({
		activeAdminCount,
		errorMessage,
		noticeMessage,
		users,
		viewer
	}: UsersPageProps) => (
		<Layout title="Users" viewer={viewer}>
			<section>
				<h1>User Management</h1>
				{noticeMessage ? (
					<p className="banner banner--notice">{noticeMessage}</p>
				) : null}
				{errorMessage ? (
					<p className="banner banner--error">{errorMessage}</p>
				) : null}
				<p>
					Admins can promote, demote, and enable or disable local dashboard
					access. Keycloak remains the authentication source.
				</p>
				<table className="data-table">
					<thead>
						<tr>
							<th>User</th>
							<th>Role</th>
							<th>Status</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{users.map((managedUser) => {
							const isCurrentUser = managedUser.id === viewer.id
							const isLastActiveAdmin =
								managedUser.role === "admin" &&
								managedUser.isActive &&
								activeAdminCount === 1
							const roleIntent =
								managedUser.role === "admin" ? "demote" : "promote"
							const roleLabel =
								managedUser.role === "admin"
									? "Make member"
									: "Promote to admin"
							const accessIntent = managedUser.isActive ? "disable" : "enable"
							const accessLabel = managedUser.isActive
								? "Disable access"
								: "Enable access"
							const actionDisabled = isCurrentUser || isLastActiveAdmin

							return (
								<tr key={managedUser.id}>
									<td>
										<strong>
											{managedUser.displayName ?? managedUser.email}
										</strong>
										<div className="table-meta">{managedUser.email}</div>
										{isCurrentUser ? (
											<div className="table-meta">Your account</div>
										) : null}
										{isLastActiveAdmin ? (
											<div className="table-meta">Last active admin</div>
										) : null}
									</td>
									<td>
										<span
											className={`badge badge--${managedUser.role === "admin" ? "primary" : "disabled"}`}
										>
											{managedUser.role}
										</span>
									</td>
									<td>
										<span
											className={`badge badge--${managedUser.isActive ? "active" : "disabled"}`}
										>
											{managedUser.isActive ? "active" : "disabled"}
										</span>
									</td>
									<td>
										<div className="row-actions">
											<form action={routes.users.update.href()} method="post">
												<input
													name="userId"
													type="hidden"
													value={managedUser.id}
												/>
												<input name="intent" type="hidden" value={roleIntent} />
												<button
													data-variant="secondary"
													disabled={actionDisabled}
													type="submit"
												>
													{roleLabel}
												</button>
											</form>
											<form action={routes.users.update.href()} method="post">
												<input
													name="userId"
													type="hidden"
													value={managedUser.id}
												/>
												<input
													name="intent"
													type="hidden"
													value={accessIntent}
												/>
												<button
													data-variant="secondary"
													disabled={actionDisabled}
													type="submit"
												>
													{accessLabel}
												</button>
											</form>
										</div>
									</td>
								</tr>
							)
						})}
					</tbody>
				</table>
			</section>
		</Layout>
	)
}

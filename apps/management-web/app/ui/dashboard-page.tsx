import type { Viewer } from "../models/user.ts"
import { routes } from "../routes.ts"
import { Layout } from "./layout.tsx"

export interface DashboardPageProps {
	viewer: Viewer
}

export function DashboardPage() {
	return ({ viewer }: DashboardPageProps) => (
		<Layout title="Dashboard" viewer={viewer}>
			<section>
				<h1>Dashboard</h1>
				<p>
					Signed in as {viewer.displayName ?? viewer.email} with local role{" "}
					{viewer.role}.
				</p>
				<p>
					OIDC login and first-admin bootstrap are wired. The next slices are
					link/domain workflows.
				</p>
				<p>
					Open the <a href={routes.links.index.href()}>links page</a> to create,
					update, search, or delete short links.
				</p>
				<p>
					Open the <a href={routes.domains.index.href()}>domains page</a> to add
					redirect hosts and verify their DNS.
				</p>
				{viewer.role === "admin" ? (
					<p>
						Open the{" "}
						<a href={routes.users.index.href()}>user-management page</a> to
						promote, demote, or disable local dashboard users.
					</p>
				) : null}
			</section>
		</Layout>
	)
}

import type { RemixNode } from "remix/ui"

import type { Viewer } from "../models/user.ts"
import { routes } from "../routes.ts"
import { hasPermission } from "../security.ts"
import { Document } from "./document.tsx"

export interface LayoutProps {
	children?: RemixNode
	title: string
	viewer?: Viewer | null
}

export function Layout() {
	return ({ children, title, viewer }: LayoutProps) => (
		<Document title={title}>
			<header className="site-header">
				<nav className="site-nav">
					<a href={routes.home.href()}>Home</a>
					{viewer ? <a href={routes.dashboard.href()}>Dashboard</a> : null}
					{viewer && hasPermission(viewer, "links:manage") ? (
						<a href={routes.links.index.href()}>Links</a>
					) : null}
					{viewer && hasPermission(viewer, "domains:manage") ? (
						<a href={routes.domains.index.href()}>Domains</a>
					) : null}
					{viewer && hasPermission(viewer, "users:manage") ? (
						<a href={routes.users.index.href()}>Users</a>
					) : null}
				</nav>
				{viewer ? (
					<div className="site-user">
						<span>{viewer.displayName ?? viewer.email}</span>
						<form action={routes.auth.logout.href()} method="post">
							<button type="submit">Sign out</button>
						</form>
					</div>
				) : null}
			</header>
			<main className="page-content">{children}</main>
		</Document>
	)
}

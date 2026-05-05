import type { PendingBootstrapState } from "../security.ts"
import { routes } from "../routes.ts"
import { Layout } from "./layout.tsx"

export interface BootstrapPageProps {
	candidate: PendingBootstrapState
	errorMessage?: string
	noticeMessage?: string
}

export function BootstrapPage() {
	return ({ candidate, errorMessage, noticeMessage }: BootstrapPageProps) => (
		<Layout title="First Admin Setup">
			<section>
				<h1>First Admin Setup</h1>
				{noticeMessage ? (
					<p className="banner banner--notice">{noticeMessage}</p>
				) : null}
				{errorMessage ? (
					<p className="banner banner--error">{errorMessage}</p>
				) : null}
				<p>
					No local users exist yet. Claim the first admin account for{" "}
					{candidate.displayName ?? candidate.email}.
				</p>
				<p>
					This action is available only until the first local admin user is
					created.
				</p>
				<form action={routes.bootstrap.claim.href()} method="post">
					<button type="submit">Create the first admin account</button>
				</form>
				<form action={routes.auth.logout.href()} method="post">
					<button type="submit">Cancel and sign out</button>
				</form>
			</section>
		</Layout>
	)
}

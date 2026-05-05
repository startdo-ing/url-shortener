import type { Viewer } from "../models/user.ts"
import { routes } from "../routes.ts"
import { Layout } from "./layout.tsx"

export interface HomePageProps {
	authConfigured: boolean
	viewer: Viewer | null
}

export function HomePage() {
	return ({ authConfigured, viewer }: HomePageProps) => (
		<Layout title="Management Web" viewer={viewer}>
			<section>
				<h1>Management Web</h1>
				<p>
					Keycloak OIDC is now the entry point for the management dashboard.
				</p>
				<p>
					Auth status:{" "}
					{authConfigured ? "configured" : "configuration incomplete"}.
				</p>
				{viewer ? (
					<p>
						Signed in as {viewer.displayName ?? viewer.email}. Open the{" "}
						<a href={routes.dashboard.href()}>dashboard</a>.
					</p>
				) : (
					<p>
						Open the <a href={routes.auth.index.href()}>auth screen</a> to
						finish Keycloak setup and sign in.
					</p>
				)}
			</section>
		</Layout>
	)
}

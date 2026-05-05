import type { Viewer } from "../models/user.ts"
import { routes } from "../routes.ts"
import { Layout } from "./layout.tsx"

export interface AuthPageProps {
	authConfigured: boolean
	authErrors: string[]
	errorMessage?: string
	issuer: string | null
	loginHref: string
	noticeMessage?: string
	viewer: Viewer | null
}

export function AuthPage() {
	return ({
		authConfigured,
		authErrors,
		errorMessage,
		issuer,
		loginHref,
		noticeMessage,
		viewer
	}: AuthPageProps) => (
		<Layout title="Auth" viewer={viewer}>
			<section>
				<h1>Authentication</h1>
				{noticeMessage ? (
					<p className="banner banner--notice">{noticeMessage}</p>
				) : null}
				{errorMessage ? (
					<p className="banner banner--error">{errorMessage}</p>
				) : null}
				{viewer ? (
					<>
						<p>
							Signed in as {viewer.displayName ?? viewer.email}. Continue to the{" "}
							<a href={routes.dashboard.href()}>dashboard</a> or sign out.
						</p>
					</>
				) : authConfigured ? (
					<>
						<p>Keycloak is configured and ready for OIDC sign-in.</p>
						<p>
							<a href={loginHref}>Sign in with Keycloak</a>
						</p>
						{issuer ? <p>Issuer: {issuer}</p> : null}
					</>
				) : (
					<>
						<p>Keycloak configuration is incomplete.</p>
						<ul>
							{authErrors.map((error) => (
								<li key={error}>{error}</li>
							))}
						</ul>
					</>
				)}
			</section>
		</Layout>
	)
}

import { Auth } from "remix/auth-middleware"
import type { BuildAction } from "remix/fetch-router"

import type { Viewer } from "../models/user.ts"
import type { routes } from "../routes.ts"
import { getAuthDiagnostics } from "../security.ts"
import { HomePage } from "../ui/home-page.tsx"
import { render } from "../utils/render.tsx"

export const home: BuildAction<"GET", typeof routes.home> = {
	handler(context) {
		const authState = context.get(Auth)
		const viewer = authState.ok ? (authState.identity as Viewer) : null

		return render(
			<HomePage
				authConfigured={getAuthDiagnostics().configured}
				viewer={viewer}
			/>,
			context.request
		)
	}
}

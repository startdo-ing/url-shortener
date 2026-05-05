import type { BuildAction } from "remix/fetch-router"

import type { Viewer } from "../models/user.ts"
import type { routes } from "../routes.ts"
import { getViewer, requireSignedInViewer } from "../security.ts"
import { DashboardPage } from "../ui/dashboard-page.tsx"
import { render } from "../utils/render.tsx"

export const dashboard: BuildAction<"GET", typeof routes.dashboard> = {
	middleware: [requireSignedInViewer],
	handler(context) {
		const viewer = getViewer(context) as Viewer

		return render(<DashboardPage viewer={viewer} />, context.request)
	}
}

import { createRouter } from "remix/fetch-router"

import { auth } from "./controllers/auth.tsx"
import { bootstrap } from "./controllers/bootstrap.tsx"
import { dashboard } from "./controllers/dashboard.tsx"
import { domainManagement } from "./controllers/domains.tsx"
import { home } from "./controllers/home.tsx"
import { linkManagement } from "./controllers/links.tsx"
import { userManagement } from "./controllers/users.tsx"
import { routes } from "./routes.ts"
import { requestAuthMiddleware, sessionMiddleware } from "./security.ts"

export const router = createRouter({
	middleware: [sessionMiddleware, requestAuthMiddleware] as const
})

router.map(routes.home, home)
router.map(routes.dashboard, dashboard)
router.map(routes.domains, domainManagement)
router.map(routes.links, linkManagement)
router.map(routes.users, userManagement)
router.map(routes.bootstrap, bootstrap)
router.map(routes.auth, auth)

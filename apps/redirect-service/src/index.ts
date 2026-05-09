import { startServer } from "./server.ts"

export { createAppFetch } from "./app-fetch.ts"
export { handleInternalRequest } from "./handlers/internal.ts"
export { handleRedirectRequest } from "./handlers/redirect.ts"
export { pruneClickEvents } from "./redirect/click-events.ts"

if (import.meta.main) {
	startServer()
}

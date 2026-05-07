import { FLASH_ERROR_KEY, FLASH_NOTICE_KEY } from "./auth/constants"
import { pullFlash, readSession, setSessionCookie } from "./auth/session"
import { findViewerById, type Viewer } from "./models/user"

export interface PageContext {
	viewer: Viewer | null
	error: string | null
	notice: string | null
}

export async function loadPageContext(
	request: Request,
	response: { headers: Headers }
): Promise<PageContext> {
	const session = readSession(request)
	const viewer = session.auth?.userId
		? await findViewerById(session.auth.userId)
		: null

	const error = pullFlash(session, FLASH_ERROR_KEY)
	const notice = pullFlash(session, FLASH_NOTICE_KEY)

	if (error || notice) {
		response.headers.set("Set-Cookie", setSessionCookie(session))
	}

	return { viewer, error: error ?? null, notice: notice ?? null }
}

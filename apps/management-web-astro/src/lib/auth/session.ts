import { createHmac, timingSafeEqual } from "node:crypto"

import type { SessionState } from "./constants"

const COOKIE_NAME = "__management_session"
const maxAgeSeconds = 60 * 60 * 24 * 14

const fallbackSecret = `${crypto.randomUUID()}${crypto.randomUUID()}`
const sessionSecret = process.env.SESSION_SECRET?.trim() || fallbackSecret

export function readSession(request: Request): SessionState {
	const cookieHeader = request.headers.get("cookie")
	if (!cookieHeader) {
		return {}
	}

	const cookieValue = readCookie(cookieHeader, COOKIE_NAME)
	if (!cookieValue) {
		return {}
	}

	const [payload, signature] = cookieValue.split(".")
	if (!payload || !signature) {
		return {}
	}

	const expected = sign(payload)
	if (!safeEqual(expected, signature)) {
		return {}
	}

	try {
		const decoded = Buffer.from(payload, "base64url").toString("utf8")
		const parsed = JSON.parse(decoded)
		if (parsed == null || typeof parsed !== "object") {
			return {}
		}

		return parsed as SessionState
	} catch {
		return {}
	}
}

export function setSessionCookie(state: SessionState): string {
	const payload = Buffer.from(JSON.stringify(state), "utf8").toString(
		"base64url"
	)
	const signature = sign(payload)
	const value = `${payload}.${signature}`

	return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secureFlag()}`
}

export function clearSessionCookie(): string {
	return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag()}`
}

export function flash(state: SessionState, key: string, message: string) {
	state.flashes ??= {}
	state.flashes[key] = message
}

export function pullFlash(state: SessionState, key: string) {
	const value = state.flashes?.[key]
	if (value == null) {
		return undefined
	}

	delete state.flashes?.[key]
	if (state.flashes && Object.keys(state.flashes).length === 0) {
		state.flashes = undefined
	}

	return value
}

function sign(value: string) {
	return createHmac("sha256", sessionSecret).update(value).digest("base64url")
}

function safeEqual(left: string, right: string) {
	const leftBytes = Buffer.from(left)
	const rightBytes = Buffer.from(right)
	if (leftBytes.length !== rightBytes.length) {
		return false
	}

	return timingSafeEqual(leftBytes, rightBytes)
}

function readCookie(cookieHeader: string, name: string) {
	const cookies = cookieHeader.split(";")
	for (const rawCookie of cookies) {
		const trimmed = rawCookie.trim()
		if (!trimmed.startsWith(`${name}=`)) {
			continue
		}

		return trimmed.slice(name.length + 1)
	}

	return null
}

function secureFlag() {
	const appUrl = process.env.APP_URL?.trim()
	if (appUrl?.startsWith("https://")) {
		return "; Secure"
	}

	return ""
}

export function redirectWithSession(target: string, session: SessionState) {
	return new Response(null, {
		status: 302,
		headers: {
			Location: target,
			"Set-Cookie": setSessionCookie(session)
		}
	})
}

import { scryptSync, timingSafeEqual } from "node:crypto"

export async function readPasswordFromRequest(
	req: Request
): Promise<string | null> {
	if (req.method !== "POST") {
		return null
	}

	const contentType = req.headers.get("content-type") ?? ""
	if (!contentType.includes("application/x-www-form-urlencoded")) {
		return null
	}

	const formData = await req.formData()
	const password = formData.get("password")
	if (typeof password !== "string") {
		return null
	}

	const trimmed = password.trim()
	return trimmed.length > 0 ? trimmed : null
}

export function verifyLinkPassword(
	password: string,
	storedHash: string
): boolean {
	const [version, salt, expectedKey] = storedHash.split(":")
	if (version !== "s1" || !salt || !expectedKey) {
		return false
	}

	const actual = scryptSync(password, salt, 32).toString("base64url")
	const expectedBuffer = Buffer.from(expectedKey)
	const actualBuffer = Buffer.from(actual)
	if (expectedBuffer.length !== actualBuffer.length) {
		return false
	}

	return timingSafeEqual(expectedBuffer, actualBuffer)
}

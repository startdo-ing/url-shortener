import {
	extractHtmlTitle,
	recommendSlugFromTitle
} from "../../../lib/slug-recommendation"
import { json, requireApiViewer, type ApiRoute } from "../../../lib/api"

interface RecommendSlugDependencies {
	fetchFn: typeof fetch
	requireApiViewerFn: typeof requireApiViewer
}

const defaultDependencies: RecommendSlugDependencies = {
	fetchFn: fetch,
	requireApiViewerFn: requireApiViewer
}

function isPrivateHost(hostname: string): boolean {
	const h = hostname.replace(/^\[|\]$/g, "").toLowerCase()

	// Localhost and common local hostnames
	if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) {
		return true
	}

	// IPv6 loopback, link-local (fe80::/10), unique-local (fc00::/7)
	if (h === "::1" || /^fe[89ab][0-9a-f]:/i.test(h) || /^f[cd]/i.test(h)) {
		return true
	}

	// IPv4 range checks
	const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
	if (ipv4) {
		const [a, b] = [ipv4[1], ipv4[2]].map(Number)
		if (
			a === 0 || // 0.0.0.0/8 — unspecified
			a === 10 || // 10.0.0.0/8 — private
			a === 127 || // 127.0.0.0/8 — loopback
			(a === 169 && b === 254) || // 169.254.0.0/16 — link-local
			(a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 — private
			(a === 192 && b === 168) // 192.168.0.0/16 — private
		) {
			return true
		}
	}

	return false
}

function readTargetUrl(rawValue: string | null): URL | Response {
	const value = rawValue?.trim()
	if (!value) {
		return json({ error: "targetUrl query parameter is required." }, 400)
	}

	let parsed: URL
	try {
		parsed = new URL(value)
	} catch {
		return json({ error: "targetUrl must be a valid absolute URL." }, 400)
	}

	if (!["http:", "https:"].includes(parsed.protocol)) {
		return json({ error: "targetUrl must use http or https." }, 400)
	}

	if (isPrivateHost(parsed.hostname)) {
		return json({ error: "targetUrl must be a public URL." }, 400)
	}

	return parsed
}

export function createRecommendSlugHandlers(
	dependencies: RecommendSlugDependencies = defaultDependencies
) {
	const GET: ApiRoute = async ({ request, url }) => {
		const auth = await dependencies.requireApiViewerFn(request, "links:manage")
		if (auth instanceof Response) {
			return auth
		}

		const parsedUrl = readTargetUrl(url.searchParams.get("targetUrl"))
		if (parsedUrl instanceof Response) {
			return parsedUrl
		}

		const fallbackSlug = recommendSlugFromTitle(null, parsedUrl)

		try {
			const response = await dependencies.fetchFn(parsedUrl.toString(), {
				headers: {
					accept: "text/html,application/xhtml+xml"
				},
				redirect: "follow",
				signal: AbortSignal.timeout(5000)
			})

			if (!response.ok) {
				return json({ slug: fallbackSlug, source: "url", title: null })
			}

			const html = await response.text()
			const title = extractHtmlTitle(html)
			const slug = recommendSlugFromTitle(title, parsedUrl)

			return json({
				slug,
				source: title ? "title" : "url",
				title
			})
		} catch {
			return json({ slug: fallbackSlug, source: "url", title: null })
		}
	}

	return { GET }
}

const handlers = createRecommendSlugHandlers()

export const GET = handlers.GET

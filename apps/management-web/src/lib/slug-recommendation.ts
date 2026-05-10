const TITLE_PATTERN = /<title[^>]*>([\s\S]*?)<\/title>/i
const MAX_SLUG_LENGTH = 64

export function slugify(value: string): string {
	const normalized = value
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/&/g, " and ")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")

	return normalized.slice(0, MAX_SLUG_LENGTH).replace(/^-+|-+$/g, "")
}

export function decodeHtmlEntities(value: string): string {
	const namedEntities: Record<string, string> = {
		amp: "&",
		apos: "'",
		gt: ">",
		lt: "<",
		nbsp: " ",
		quot: '"'
	}

	return value
		.replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
		.replace(/&#x([\da-fA-F]+);/g, (_, hex: string) =>
			String.fromCodePoint(parseInt(hex, 16))
		)
		.replace(
			/&([a-z]+);/gi,
			(entity, name: string) => namedEntities[name.toLowerCase()] ?? entity
		)
}

export function extractHtmlTitle(html: string): string | null {
	const match = html.match(TITLE_PATTERN)
	if (!match) {
		return null
	}

	const title = decodeHtmlEntities(match[1]).trim()
	return title.length > 0 ? title : null
}

export function fallbackSlugFromUrl(targetUrl: URL): string {
	const segments = targetUrl.pathname
		.split("/")
		.map((segment) => segment.trim())
		.filter((segment) => segment.length > 0)

	for (let i = segments.length - 1; i >= 0; i -= 1) {
		const fromPath = slugify(decodeURIComponent(segments[i]))
		if (fromPath.length > 0) {
			return fromPath
		}
	}

	const hostFallback = slugify(targetUrl.hostname.replace(/^www\./i, ""))
	if (hostFallback.length > 0) {
		return hostFallback
	}

	return "link"
}

export function recommendSlugFromTitle(
	title: string | null,
	targetUrl: URL
): string {
	const fromTitle = title ? slugify(title) : ""
	if (fromTitle.length > 0) {
		return fromTitle
	}

	return fallbackSlugFromUrl(targetUrl)
}

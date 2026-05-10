import { describe, expect, it } from "bun:test"

import {
	extractHtmlTitle,
	fallbackSlugFromUrl,
	recommendSlugFromTitle,
	slugify
} from "./slug-recommendation"

describe("slug recommendation", () => {
	it("slugifies human-readable titles", () => {
		expect(slugify("Hello World: Product Docs")).toBe(
			"hello-world-product-docs"
		)
	})

	it("extracts and decodes html titles", () => {
		const html =
			"<html><head><title>Tom &amp; Jerry &#x2014; Docs</title></head></html>"
		expect(extractHtmlTitle(html)).toBe("Tom & Jerry — Docs")
	})

	it("falls back to path segment when title is missing", () => {
		const targetUrl = new URL("https://example.com/docs/getting-started")
		expect(fallbackSlugFromUrl(targetUrl)).toBe("getting-started")
	})

	it("uses title when available and falls back otherwise", () => {
		const targetUrl = new URL("https://example.com/")
		expect(recommendSlugFromTitle("Launch Plan", targetUrl)).toBe("launch-plan")
		expect(recommendSlugFromTitle(null, targetUrl)).toBe("example-com")
	})
})

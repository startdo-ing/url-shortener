import type { RemixNode } from "remix/ui"

import { globalStyles } from "./styles.ts"

export interface DocumentProps {
	children?: RemixNode
	title: string
}

export function Document() {
	return ({ children, title }: DocumentProps) => (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>{title}</title>
				<style>{globalStyles}</style>
			</head>
			<body className="shell">
				{children}
				<script type="module" src="/assets/entry.js" />
			</body>
		</html>
	)
}

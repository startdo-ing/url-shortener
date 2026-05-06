import { defineConfig } from "astro/config"
import svelte from "@astrojs/svelte"
import node from "@astrojs/node"

export default defineConfig({
	output: "server",
	adapter: node({ mode: "standalone" }),
	integrations: [svelte()],
	vite: {
		ssr: {
			// bun:sqlite is a Bun-native protocol; externalize so Vite uses
			// native import() (handled by Bun) instead of the Node ESM evaluator
			external: ["bun:sqlite", "drizzle-orm/bun-sqlite"]
		}
	}
})

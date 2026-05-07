import { defineConfig } from "astro/config"
import svelte from "@astrojs/svelte"
import node from "@astrojs/node"
import { setMaxListeners } from "node:events"

// Bun + Vite may attach more than 10 FSWatcher listeners in dev mode.
// Raise the global EventTarget limit to prevent noisy warnings.
setMaxListeners(50)

export default defineConfig({
	output: "server",
	adapter: node({ mode: "standalone" }),
	integrations: [svelte()],
	security: {
		checkOrigin: false
	},
	vite: {
		ssr: {
			// bun:sqlite is a Bun-native protocol; externalize so Vite uses
			// native import() (handled by Bun) instead of the Node ESM evaluator
			external: ["bun:sqlite", "drizzle-orm/bun-sqlite"]
		}
	}
})

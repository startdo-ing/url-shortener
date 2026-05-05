import { run } from "remix/ui"

run({
	async loadModule(moduleUrl: string, exportName: string) {
		const mod = await import(moduleUrl)
		return mod[exportName]
	},
	async resolveFrame(src: string, signal?: AbortSignal) {
		const response = await fetch(src, {
			headers: { accept: "text/html" },
			signal
		})
		return response.body ?? (await response.text())
	}
})

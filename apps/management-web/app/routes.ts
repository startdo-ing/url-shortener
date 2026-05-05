import { route } from "remix/fetch-router/routes"

export const routes = route({
	home: "/",
	dashboard: "/dashboard",
	domains: {
		index: { method: "GET", pattern: "/domains" },
		mutate: { method: "POST", pattern: "/domains" }
	},
	links: {
		index: { method: "GET", pattern: "/links" },
		mutate: { method: "POST", pattern: "/links" }
	},
	users: {
		index: { method: "GET", pattern: "/users" },
		update: { method: "POST", pattern: "/users" }
	},
	bootstrap: {
		index: { method: "GET", pattern: "/setup/first-admin" },
		claim: { method: "POST", pattern: "/setup/first-admin" }
	},
	auth: {
		index: "/auth",
		login: "/auth/login",
		callback: "/auth/callback",
		logout: { method: "POST", pattern: "/auth/logout" }
	}
})

import type { APIRoute } from "astro"

export const GET: APIRoute = ({ request }) => {
	const destination = new URL(request.url)
	destination.pathname = "/users"
	return Response.redirect(destination.toString(), 302)
}

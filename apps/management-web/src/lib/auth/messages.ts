import { getAuthDiagnostics } from "./config"

export function formatAuthError(error: unknown) {
	if (error instanceof Error && error.message.length > 0) {
		return error.message
	}

	return "Keycloak sign-in failed. Please try again."
}

export function missingConfigurationMessage() {
	return `Keycloak is not configured: ${getAuthDiagnostics().errors.join("; ")}`
}

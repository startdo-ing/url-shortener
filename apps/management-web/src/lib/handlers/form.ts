export function readOptionalValue(
	value: FormDataEntryValue | string | null
): string | undefined {
	if (typeof value !== "string") {
		return undefined
	}

	const trimmed = value.trim()
	return trimmed.length > 0 ? trimmed : undefined
}

export function readRequiredValue(formData: FormData, key: string): string {
	const value = readOptionalValue(formData.get(key))
	if (value == null) {
		throw new Error(`Missing ${key}.`)
	}

	return value
}

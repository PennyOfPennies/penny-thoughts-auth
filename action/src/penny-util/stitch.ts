/** This module is for string-related functions */

export interface TryParseJsonOptions {
	decodeUriComponent?: boolean;
	errorReturnValue?: any;
}

export function tryParseJson(json: string | undefined | null, options: TryParseJsonOptions = {}) {
	const { decodeUriComponent, errorReturnValue } = options
	const errorValue = errorReturnValue ?? null
	if (json == null) return errorValue

	try {
		if (decodeUriComponent) json = decodeURIComponent(json)
		const result = JSON.parse(json)
		return result
	} catch (error) {
		return errorValue
	}
}

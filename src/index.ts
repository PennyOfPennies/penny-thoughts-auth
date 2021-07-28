import { Handler, Context, Callback } from "aws-lambda"

function getResponse(json: object) {
	return {
		statusCode: 200,
		body: JSON.stringify(json)
	}
}

export const handler: Handler = async (event: any, _context: Context, _handler: Callback) => {
	console.log("event that was passed", event)
	return getResponse({ message: "This is a test from a Lambda."})
}

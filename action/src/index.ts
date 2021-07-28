import { ERROR, PennyStackBuilder } from "./penny-stack-builder"

async function run() {
	const psb = new PennyStackBuilder({
		apiKey: "123",
		stackName: "penny-thoughts-auth",
		user: "penny"
	})

	const ENV = process.env.ENVIRONMENT
	const successfulInitialization = await psb.init({ ignoreFailure: ENV == "dev"})
	if (!successfulInitialization) return

	const lambda = await psb.lambda.createLambda({
		name: "authorize",
		zipLocation: "./dist.zip",
		handler: "dist/index.handler"
		// environmentVariables: {

		// }
	})
	if (lambda === ERROR) {
		console.warn("There was an error creating the lambda")
	}

	// The stack that gets saved needs to be k/v not array and needs to use the action name + the resource name as a key. When rebuilding, we'll just look for this in that stack that we load to see if everything is the same. The action also needs to keep track of the action number too which may update if new things happen first now...

	// 

	// Update some k/v store with psb data
		// Setup a cloudflare worker to handle this
}

try {
	run()
} catch (error) {
	console.warn("There was an error with the penny-thoughts-auth action", {
		region: process.env.REGION,
		environment: process.env.ENVIRONMENT
	})
}
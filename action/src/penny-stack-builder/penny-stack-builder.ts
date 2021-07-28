import { config } from 'aws-sdk'
import { IAMBuilder } from './iam-builder'
import { LambdaBuilder } from './lambda-builder'
import fetch from "node-fetch"

const ENV = process.env.ENVIRONMENT
const ACCOUNT_NUMBER = process.env.ACCOUNT_NUMBER
const REGION = process.env.REGION

export const ERROR = "error"

export enum State {
	"ready", "rollback"
}

export interface Action {
	name: string;
	data: Record<string, any>;
}

/** ```typescript
	const options: StackBuilderOptions = {
      apiKey: "xyz",
      stackName: "penny-stack-auth",
      user: "lividlair"
	};
```*/
export interface StackBuilderOptions {
	/** API key used for authenticating the stack builder service. */
	apiKey: string;
	/** The name of the stack to be built. */
	stackName: string;
	/** The name of the user calling the builder. */
	user: string;
}

export interface Stack {
	name: string
	user: string
	state: State
	actions: Record<string, Action>
}

export class PennyStackBuilder {
	apiKey: string
	stack: Stack

	iam: IAMBuilder
	lambda: LambdaBuilder

	constructor(options: StackBuilderOptions) {
		if (ENV == null || ENV == "" || REGION == null || REGION == "" || ACCOUNT_NUMBER == null || ACCOUNT_NUMBER == "") {
			throw new Error("REGION, ACCOUNT_NUMBER, and ENVIRONMENT not all found in environment variables.")
		}

		const { apiKey, stackName, user } = options
		this.apiKey = apiKey
		this.stack = {
			user,
			name: (ENV == "production" ? stackName : `${stackName}-${ENV}`),
			state: State.ready,
			actions: {}
		}

		this.iam = new IAMBuilder(this)
		this.lambda = new LambdaBuilder(this)
	}

	async init(options = { ignoreFailure: false }) {
		const { ignoreFailure } = options

		const response = await fetch("https://www.pennystackbuilder.com/api/load", {
			method: "POST",
			// mode: "cors", // no-cors, *cors, same-origin
    	// cache: "no-cache",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				name: this.stack.name,
				user: this.stack.user,
				apiKey: this.apiKey
			})
		})

		try {
			const stackResponse: { stack: Stack } = await response.json()
			console.debug("Stack response", stackResponse)
			if (stackResponse.stack) {
				this.stack = stackResponse.stack
			}
			return true
		} catch (error) {
			console.warn("Error loading stack", { error, ignoreFailure })
			if (options?.ignoreFailure) return true
			return false
		}
	}

	isSame(data: [string | null | undefined, string | null | undefined][]) {
		return data.reduce((isSame, tuple) => {
			if (!isSame) return false
			return (tuple[0] == tuple[1])
		}, true)
	}

	getAction<T extends Action>(actionName: string) {
		return this.stack.actions[actionName] as T | undefined
	}

	updateAction(action: Action) {
		this.stack.actions[action.name] = action
	}

	handleError(): "error" {
		this.stack.state = State.rollback
		return ERROR
	}
}
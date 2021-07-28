import { Lambda as AWSLambda } from 'aws-sdk'
import { ManagedPolicyOptions, PolicyEffect, PolicyVersion } from '../iam-builder'
import { ERROR, PennyStackBuilder, State } from '../penny-stack-builder'
import { FunctionOptions, LambdaFunction, Runtimes } from './lambda-function'
import { Lambda, LambdaOptions } from './lambda'

const awsLambda = new AWSLambda({ apiVersion: '2015-03-31', region: process.env.REGION })
const ACCOUNT_NUMBER = process.env.ACCOUNT_NUMBER!
const REGION = process.env.REGION!

export class LambdaBuilder {
	constructor(public stackBuilder: PennyStackBuilder) {}

	/**
		Creates or updates a function. Not all aws features are currently supported. Features not supported:
		* * Code from images or s3 buckets (only supports zip files)
		* * Code Signing Configs
		* * Dead Letter Configs
		* * File System Configs
		* * Image Configs
		* * Tracing Configs
		* * VPC Configs
	*/
	async createFunction(options: FunctionOptions) {
		if (this.stackBuilder.stack.state !== State.ready) return ERROR
		const lambdaFunction = new LambdaFunction(awsLambda, this.stackBuilder)
		const awsLambdaFunction = await lambdaFunction.get(options.name)
		
		if (awsLambdaFunction === ERROR) {
			return this.stackBuilder.handleError()
		} else if (awsLambdaFunction != null) {
			if (awsLambdaFunction.Configuration == null) return this.stackBuilder.handleError()
			const configs = awsLambdaFunction.Configuration
			const tags = awsLambdaFunction.Tags 
			return await lambdaFunction.update(configs, tags, options)
		} else {
			return await lambdaFunction.create(options)
		}
	}

	async createLambda(options: LambdaOptions) {
		if (this.stackBuilder.stack.state !== State.ready) return ERROR

		const lambda = new Lambda(awsLambda, this.stackBuilder)
		const lambdaFunction = await lambda.create(options)
		if (lambdaFunction === ERROR) return this.stackBuilder.handleError()
		return lambdaFunction
	}
}
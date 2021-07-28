import { Lambda as AWSLambda, IAM } from 'aws-sdk';
import { ManagedPolicyOptions, PolicyEffect, PolicyVersion } from '../iam-builder';
import { ERROR, PennyStackBuilder } from '../penny-stack-builder';
import { Runtimes } from "./lambda-function";

const ACCOUNT_NUMBER = process.env.ACCOUNT_NUMBER!
const REGION = process.env.REGION!

export interface LambdaOptions {
	name: string;
	zipLocation: string;
	handler: string;
	/** A default role for executing the lambda will be created if this is left undefined. */
	customRole?: IAM.Role;
	/** A default managed policy for the lambda to use while executing will be created if this is left undefined. */
	customManagedPolicy?: IAM.Policy;
	runtime?: Runtimes;
	description?: string;
	environmentVariables?: Record<string, string>;
}

export class Lambda {
	constructor(public awsLambda: AWSLambda, public stackBuilder: PennyStackBuilder) {}

	private async createDefaultManagedPolicyForLambdaRole(name: string) {
		const managedPolicyName = `${name}-exe-policy`
		const managedPolicyParams: ManagedPolicyOptions = {
			policyDocument: {
				Version: PolicyVersion.default,
				Statement: [
					{
						Effect: PolicyEffect.Allow,
						Action: "logs:CreateLogGroup",
						Resource: `arn:aws:logs:${REGION}:${ACCOUNT_NUMBER}:*`
					},
					{
						Effect: PolicyEffect.Allow,
						Action: [
							"logs:CreateLogStream",
							"logs:PutLogEvents"
						],
						Resource: [
							`arn:aws:logs:${REGION}:${ACCOUNT_NUMBER}:log-group:/aws/lambda/${name}:*`
						]
					}
				]
			},
			name: managedPolicyName,
			description: `Basic execution policy for ${name}`
		}
		return await this.stackBuilder.iam.createManagedPolicy(managedPolicyParams)
	}

	private async addManagedPolicyToRole(name: string, role: IAM.Role, customManagedPolicy?: IAM.Policy) {
		const managedPolicy = customManagedPolicy
			? customManagedPolicy
			: await this.createDefaultManagedPolicyForLambdaRole(name)
		if (managedPolicy === ERROR) return false
		
		return await this.stackBuilder.iam.addManagedPolicyToRole({
			roleName: role.RoleName, policyArn: managedPolicy.Arn!
		})
	}

	private async createDefaultRole(name: string) {
		const roleName = `${name}-role`
		const role = await this.stackBuilder.iam.createRole({
			name: roleName,
			assumeRolePolicyDocument: {
				Version: PolicyVersion.default,
				Statement: [
					{
						Effect: PolicyEffect.Allow,
						Principal: {
							Service: "lambda.amazonaws.com"
						},
						Action: "sts:AssumeRole"
					}
				]
			}
		})
		if (role === ERROR) return ERROR

		return role
	}

	async create(options: LambdaOptions) {
		const { name, customManagedPolicy, customRole } = options
		const fullName = `${this.stackBuilder.stack.name}-${name}`

		const lambdaRole = customRole ? customRole : await this.createDefaultRole(fullName)
		if (lambdaRole === ERROR) return ERROR
		const success = await this.addManagedPolicyToRole(fullName, lambdaRole, customManagedPolicy)
		if (!success) return ERROR

		const lamdaFunction = await this.stackBuilder.lambda.createFunction({
			...options,
			name: fullName, roleArn: lambdaRole.Arn
		})
		if (lamdaFunction === ERROR) return ERROR

		return lamdaFunction
	}


}
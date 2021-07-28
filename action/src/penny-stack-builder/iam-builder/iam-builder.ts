import { IAM } from 'aws-sdk'
import { ERROR, PennyStackBuilder, State } from '../penny-stack-builder'
import { ManagedPolicyOptions, Policy } from './policy'
import { Role, RoleOptions } from './role'

const iam = new IAM({ apiVersion: '2010-05-08', region: process.env.REGION })

export class IAMBuilder {
	constructor(public stackBuilder: PennyStackBuilder) {}

	async listAllManagedPoliciesForRole(options: { roleName: string, marker?: string }): Promise<IAM.AttachedPolicy[] | "error"> {
		if (this.stackBuilder.stack.state !== State.ready) return ERROR

		const { roleName, marker } = options

		try {
			const result = await iam.listAttachedRolePolicies({
				RoleName: roleName,
				Marker: marker
			}).promise()

			const policies = result.AttachedPolicies
			if (policies == null) {
				console.warn("AttachedPolicies list is null", { roleName, result })
				return ERROR
			}

			if (result.IsTruncated) {
				const morePolicies = await this.listAllManagedPoliciesForRole({ roleName, marker: result.Marker })
				if (morePolicies === ERROR) throw "Error listing additional policies"
				return [...policies, ...morePolicies]
			} else {
				return policies
			}
		} catch (error) {
			console.warn("Error listing managed policies for role", { roleName, error })
			return ERROR
		}
	}

	async addManagedPolicyToRole(options: { policyArn: string, roleName: string }) {
		if (this.stackBuilder.stack.state !== State.ready) return false

		const { policyArn, roleName } = options
		console.log("Adding managed policy to role", { roleName, policyArn })

		const attachedPolicies = await this.listAllManagedPoliciesForRole( { roleName })
		if (attachedPolicies === ERROR) return false

		const policy = attachedPolicies.find(policy => {
			return policy.PolicyArn === policyArn
		})
		const policyAlreadyAttached = policy != null
		if (policyAlreadyAttached) return true

		try {
			console.log("Attaching policy")
			await iam.attachRolePolicy({
				RoleName: roleName,
				PolicyArn: policyArn
			}).promise()
			return true
		} catch (error) {
			console.warn("Error adding managed policy to role", { policyArn, roleName, error })
			return false
		}
	}

	async createManagedPolicy(options: ManagedPolicyOptions) {
		if (this.stackBuilder.stack.state !== State.ready) return ERROR

		const policy = new Policy(iam, this.stackBuilder)
		const iamPolicy = await policy.getManaged(options.name)
		
		if (iamPolicy === ERROR) return this.stackBuilder.handleError()
		else if (iamPolicy != null) return await policy.updateManaged(iamPolicy, options)
		else return await policy.createManaged(options)
	}

	async createRole(options: RoleOptions) {
		if (this.stackBuilder.stack.state !== State.ready) return ERROR

		const role = new Role(iam, this.stackBuilder)
		const iamRole = await role.get(options.name)

		if (iamRole === ERROR) return this.stackBuilder.handleError()
		else if (iamRole != null) return await role.update(iamRole, options)
		else return await role.create(options)
	}
}
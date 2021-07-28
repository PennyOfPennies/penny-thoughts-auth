import { IAM } from 'aws-sdk';
import deepEqual from 'deep-equal';
import { tryParseJson } from '../../penny-util/stitch';
import { ERROR, PennyStackBuilder } from '../penny-stack-builder';

const ACCOUNT_NUMBER = process.env.ACCOUNT_NUMBER!

export enum PolicyVersion {
	default = "2012-10-17"
}

export enum PolicyEffect {
	Allow = "Allow"
}

export interface PolicyPrincipal {
	AWS?: string[] | string;
	CanonicalUser?: string;
	Service?: string[] | string;
}

export interface PolicyStatement {
	Effect: PolicyEffect;
	Action: string | string[];
	Resource?: string | string[];
	Principal?: PolicyPrincipal | "*";
}

export interface PolicyDocument {
	Version: PolicyVersion;
	Statement: PolicyStatement[];
}

export interface ManagedPolicyOptions {
	name: string;
	policyDocument: PolicyDocument;
	path?: string;
	description?: string;
	tags?: { key: string; value: string; }[]
}

export class Policy {
	constructor(public iam: IAM, public stackBuilder: PennyStackBuilder) {}

	getArnFromName(name: string) {
		return `arn:aws:iam::${ACCOUNT_NUMBER}:policy/${name}`
	}

	async getManaged(name: string) {
		try {
			const result = await this.iam.getPolicy({
				PolicyArn: this.getArnFromName(name)
			}).promise()
			return result.Policy ? result.Policy : ERROR
		} catch (error) {
			if (error?.code != "NoSuchEntity") {
				console.warn("Error getting policy", { name, error })
				return ERROR
			}
		}
		return null
	}

	async getManagedVersion(name: string, /** version (v1 to v5) */ version: string): Promise<"error" | IAM.PolicyVersion | null> {
		try {
			const result = await this.iam.getPolicyVersion({
				PolicyArn: this.getArnFromName(name),
				VersionId: version
			}).promise()
			if (result.PolicyVersion == null) {
				console.warn("Unknown Error getting policy version", { name, result })
				return ERROR
			}
			return result.PolicyVersion
		} catch (error) {
			if (error?.code != "NoSuchEntity") {
				console.warn("Error getting policy version", { name, error })
				return ERROR
			}
		}
		return null
	}

	async getInline() {

	}

	async updateManaged(iamPolicy: IAM.Policy, options: ManagedPolicyOptions): Promise<"error" | IAM.Policy> {
		const { name, description, policyDocument, path, tags } = options
		console.log("Updating managed policy", { name })

		const realPath = path ?? "/"
		if (iamPolicy.Path !== realPath) {
			console.warn(`The managed policy "${name}" has the path "${iamPolicy.Path}" which is different from the supplied path "${path}". Policy paths cannot be updated. Delete the policy in aws console or revert the change to path to proceed.`)
			return ERROR
		}

		if (iamPolicy.Description !== description) {
			console.warn(`The managed policy "${name}" has the description "${iamPolicy.Description}" which is different from the supplied description "${description}". Policy descriptions cannot be updated. Delete the policy in aws console or revert the change to description to proceed.`)
			return ERROR
		}

		const version = iamPolicy.DefaultVersionId ?? "v1"
		let iamPolicyVersion = await this.getManagedVersion(name, version)
		if (iamPolicyVersion === ERROR) return ERROR
		if (iamPolicyVersion == null) {
			console.warn(`The managed policy "${name}" version "${version}" appears to exist but failed to be retrieved.`, { iamPolicy, newPolicyDocument: policyDocument, version })
			return ERROR
		}

		const oldPolicy = tryParseJson(iamPolicyVersion.Document, { decodeUriComponent: true })
		if (!deepEqual(policyDocument, oldPolicy)) {
			console.log("Updating managed policy document version", { name })

			try {
				const result = await this.iam.createPolicyVersion({
					PolicyArn: this.getArnFromName(name),
					PolicyDocument: JSON.stringify(policyDocument),
					SetAsDefault: true
				}).promise()
				iamPolicyVersion = result.PolicyVersion ? result.PolicyVersion : iamPolicyVersion
			} catch (error) {
				console.warn("Error updating managed policy version", {
					name, error, version,
					policyDocument: policyDocument,
					oldPolicyDocument: iamPolicyVersion,
				})
				return ERROR
			}
		}

		const newTags = tags?.map(tag => tag.key) ?? []
		const newTagsFull = tags ?? []
		const oldTags = iamPolicy.Tags?.map(tag => tag.Key) ?? []
		const oldTagsFull = iamPolicy.Tags ?? []

		const tagsToRemove = oldTags.filter((tag) => {
			return !newTags.includes(tag)
		})

		const tagsToAddOrUpdate = newTagsFull.filter((tag) => {
			const oldTag = oldTagsFull.find(oldTag => oldTag.Key === tag.key)
			return (!oldTag || oldTag.Value !== tag.value)
		}).map((tag) => {
			return { Key: tag.key, Value: tag.value }
		})

		if (tagsToRemove.length > 0) {
			console.log("Removing managed policy tags", { name, tagsToRemove })
			try {
				await this.iam.untagPolicy({
					PolicyArn: this.getArnFromName(name),
					TagKeys: tagsToRemove
				}).promise()
			} catch (error) {
				console.warn("Error removing tags from managed policy", {
					name, error, tagsToRemove, oldTagsFull, newTagsFull
				})
				return ERROR
			}
		}

		if (tagsToAddOrUpdate.length > 0) {
			console.log("Updating managed policy tags", { name, tagsToAddOrUpdate })
			try {
				await this.iam.tagPolicy({
					PolicyArn: this.getArnFromName(name),
					Tags: tagsToAddOrUpdate
				}).promise()
			} catch (error) {
				console.warn("Error adding tags to managed policy", {
					name, error, tagsToAddOrUpdate, oldTagsFull, newTagsFull
				})
				return ERROR
			}
		}
		iamPolicy.Tags = tags ? newTagsFull.map((tag) => { return { Key: tag.key, Value: tag.value } }) : undefined

		return iamPolicy
	}

	async updateInline() {

	}

	async createManaged(options: ManagedPolicyOptions) {
		const { name, description, policyDocument, path, tags } = options
		console.log("Creating managed policy", { name })

		try {
			const result = await this.iam.createPolicy({
				PolicyName: name,
				PolicyDocument: JSON.stringify(policyDocument),
				Description: description,
				Path: path,
				Tags: tags?.map((tag) => { return { Key: tag.key, Value: tag.value }})
			}).promise()
			return result.Policy ? result.Policy : ERROR
		} catch (error) {
			console.warn("Error creating managed policy", error)
			return ERROR
		}
	}
	
	async createInline() {

	}

	async deleteManaged() {

	}

	async deleteInline() {
		
	}
}
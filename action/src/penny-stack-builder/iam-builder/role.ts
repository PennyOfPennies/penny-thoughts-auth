import { IAM } from 'aws-sdk'
import { Action, ERROR, PennyStackBuilder } from '../penny-stack-builder'
import { PolicyDocument } from './policy'
import deepEqual from "deep-equal"
import { tryParseJson } from '../../penny-util/stitch'

export interface RoleOptions {
	/**
		The name of the role. CANNOT BE UPDATED. Role names must be unique within the account. Names are not distinguished by case. For example, you cannot create resources named both "MyResource" and "myresource".
	*/
	name: string;
	/**
		The trust relationship policy document that grants an entity permission to assume the role.

		The {@link https://en.wikipedia.org/wiki/Regular_expression regex pattern} used to validate this parameter is a string of characters consisting of the following:
		* * Any printable ASCII character ranging from the space character (**\u0020**) through the end of the ASCII character range
		* * The printable characters in the Basic Latin and Latin-1 Supplement character set (through **\u00FF**)
		* * The special characters tab (**\u0009**), line feed (**\u000A**), and carriage return (**\u000D**)
	*/
	assumeRolePolicyDocument: PolicyDocument;
	/**
		The path to the role. CANNOT BE UPDATED. For more information about paths, see {@link https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_identifiers.html IAM Identifiers}.

		This parameter is optional. If it is not included, it defaults to a slash (/).

		This parameter allows (through its {@link https://en.wikipedia.org/wiki/Regular_expression regex pattern}) a string of characters consisting of either a forward slash (/) by itself or a string that must begin and end with forward slashes. In addition, it can contain any ASCII character from the ! (\u0021) through the DEL character (\u007F), including most punctuation characters, digits, and upper and lowercased letters.
	*/
	path?: string;
	/** A description of the role. */
	description?: string;
	/**
		The maximum session duration (in seconds) that you want to set for the specified role. If you do not specify a value for this setting, the default maximum of one hour is applied. This setting can have a value from 1 hour to 12 hours.

		Anyone who assumes the role may use the **DurationSeconds** API parameter or the **duration-seconds** CLI parameter to request a longer session. The **MaxSessionDuration** setting determines the maximum duration that can be requested using the **DurationSeconds** parameter. If users don't specify a value for the **DurationSeconds** parameter, their security credentials are valid for one hour by default. This applies when you use the **AssumeRole** API operations or the **assume-role** CLI operations but does not apply when you use those operations to create a console URL. For more information, see {@link https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use.html Using IAM roles}.
	*/
	maxSessionDuration?: number;
	/** The ARN of the policy that is used to set the permissions boundary for the role. */
	permissionsBoundary?: string;
	/**
		A list of tags that you want to attach to the new role. Each tag consists of a key name and an associated value. For more information about tagging, see {@link https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags.html Tagging IAM resources}.

		@remarks If any one of the tags is invalid or if you exceed the allowed maximum number of tags, then the entirity of the related request will fail.
	*/
	tags?: { key: string; value: string }[]
}

export interface CreateRoleAction extends Action {
	data: {
		assumeRolePolicyDocument: string;
		path?: string;
		description?: string;
		
	}
}

export class Role {
	constructor(public iam: IAM, public stackBuilder: PennyStackBuilder) {}

	async get(name: string) {
		try {
			const result = await this.iam.getRole({ RoleName: name }).promise()
			return result.Role
		} catch (error) {
			if (error?.code != "NoSuchEntity") {
				console.warn("Error getting role", { name, error })
				return ERROR
			}
		}
		return null
	}

	async update(iamRole: IAM.Role, options: RoleOptions) {
		const { name, description, assumeRolePolicyDocument, path, maxSessionDuration = 3600, permissionsBoundary, tags } = options
		console.log("Updating role", { name })

		const actionName = `create-role-${name}`
		const action = this.stackBuilder.getAction<CreateRoleAction>(actionName)

		let wasChanged = action == null
		
		const realPath = path ?? "/"
		if (iamRole.Path !== realPath) {
			console.warn(`The role "${name}" has the path "${iamRole.Path}" which is different from the supplied path "${path}". Role paths cannot be updated. Delete the role in aws console or revert the change to path to proceed.`)
			return ERROR
		}

		if (description != iamRole.Description || maxSessionDuration != iamRole.MaxSessionDuration) {
			console.log("Updating description and max session duration", {
				oldDescription: iamRole.Description ?? null, description,
				oldMaxSessionDuration: iamRole.MaxSessionDuration ?? null, maxSessionDuration
			})
			try {
				await this.iam.updateRole({
					RoleName: name,
					Description: description,
					MaxSessionDuration: maxSessionDuration
				}).promise()
				iamRole.Description = description
				iamRole.MaxSessionDuration = maxSessionDuration
				wasChanged = true
			} catch (error) {
				console.warn("Error updating role", {
					name, error,
					description: description ?? null,
					maxSessionDuration: maxSessionDuration ?? null,
					oldDescription: iamRole.Description ?? null,
					oldMaxSessionDuration: iamRole.MaxSessionDuration ?? null
				})
				return ERROR
			}
		}

		if (permissionsBoundary != iamRole.PermissionsBoundary) {
			console.log("Updating permissions boundary", {
				old: iamRole.PermissionsBoundary ?? null, permissionsBoundary
			})
			try {
				if (permissionsBoundary != null) {
					await this.iam.putRolePermissionsBoundary({
						RoleName: name,
						PermissionsBoundary: permissionsBoundary
					}).promise()
				} else {
					await this.iam.deleteRolePermissionsBoundary().promise()
				}
				iamRole.PermissionsBoundary = permissionsBoundary ? {
					PermissionsBoundaryType: "PermissionsBoundaryPolicy", // slight possibility this is wrong
					PermissionsBoundaryArn: permissionsBoundary
				} : undefined
				wasChanged = true
			} catch (error) {
				console.warn("Error updating role permissions boundary", {
					name, error,
					permissionsBoundary: permissionsBoundary ?? null,
					oldPermissionsBoundary: iamRole.PermissionsBoundary ?? null
				})
				return ERROR
			}
		}

		const oldPolicy = tryParseJson(iamRole.AssumeRolePolicyDocument, { decodeUriComponent: true })
		if (!deepEqual(assumeRolePolicyDocument, oldPolicy)) {
			console.log("Updating assume role document", {
				old: iamRole.AssumeRolePolicyDocument ?? null, oldPolicy
			})
			const assumeRoleDocumentString = JSON.stringify(assumeRolePolicyDocument)
			try {
				await this.iam.updateAssumeRolePolicy({
					RoleName: name,
					PolicyDocument: assumeRoleDocumentString
				}).promise()
				iamRole.AssumeRolePolicyDocument = assumeRoleDocumentString
				wasChanged = true
			} catch (error) {
				console.warn("Error updating assume role policy document", {
					name, error,
					assumeRolePolicyDocument: assumeRolePolicyDocument,
					oldAssumeRolePolicyDocument: iamRole.AssumeRolePolicyDocument ?? null
				})
				return ERROR
			}
		}

		const newTags = tags?.map(tag => tag.key) ?? []
		const newTagsFull = tags ?? []
		const oldTags = iamRole.Tags?.map(tag => tag.Key) ?? []
		const oldTagsFull = iamRole.Tags ?? []

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
			console.log("Removing tags", {
				tagsToRemove
			})
			try {
				await this.iam.untagRole({
					RoleName: name,
					TagKeys: tagsToRemove
				}).promise()
				wasChanged = true
			} catch (error) {
				console.warn("Error removing tags from role", {
					name, error, tagsToRemove, oldTagsFull, newTagsFull
				})
				return ERROR
			}
		}

		if (tagsToAddOrUpdate.length > 0) {
			console.log("Adding tags", {
				tagsToAddOrUpdate
			})
			try {
				await this.iam.tagRole({
					RoleName: name,
					Tags: tagsToAddOrUpdate
				}).promise()
				wasChanged = true
			} catch (error) {
				console.warn("Error adding tags to role", {
					name, error, tagsToAddOrUpdate, oldTagsFull, newTagsFull
				})
				return ERROR
			}
		}
		iamRole.Tags = tags ? newTagsFull.map((tag) => { return { Key: tag.key, Value: tag.value } }) : undefined

		return iamRole
	}

	async create(options: RoleOptions) {
		const { name, description, assumeRolePolicyDocument, permissionsBoundary, maxSessionDuration, path, tags } = options
		console.log("Creating role", { name })

		const params: IAM.CreateRoleRequest = {
			RoleName: name,
			AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicyDocument),
			Description: description,
			Path: path,
			MaxSessionDuration: maxSessionDuration,
			PermissionsBoundary: permissionsBoundary,
			Tags: tags?.map((tag) => { return { Key: tag.key, Value: tag.value }})
		}
		try {
			const role = await this.iam.createRole(params).promise()
			return role.Role
		} catch (error) {
			console.warn("Error creating role", { name, assumeRolePolicyDocument, error })
			return ERROR
		}
	}
}
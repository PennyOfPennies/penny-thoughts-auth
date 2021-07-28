import { Lambda as AWSLambda } from 'aws-sdk';
import * as crypto from 'crypto';
import deepEqual from 'deep-equal';
import * as fs from 'fs';
import { promisify } from 'util';
import { ERROR, PennyStackBuilder } from "../penny-stack-builder";

const readFile = promisify(fs.readFile)

export enum Runtimes {
	node14 = "nodejs14.x"
}

const DEFAULT_RUNTIME = Runtimes.node14

export interface FunctionOptions {
	name: string;
	zipLocation: string;
	roleArn: string;
	handler: string;
	runtime?: Runtimes;
	description?: string;
	environmentVariables?: Record<string, string>;
	kmsKeyArn?: string;
	memorySize?: number;
	timeout?: number;
	tags?: Record<string, string>;
	layers?: string[];
}

export class LambdaFunction {
	constructor(public awsLambda: AWSLambda, public stackBuilder: PennyStackBuilder) {}

	async get(name: string) {
		try {
			const result = await this.awsLambda.getFunction({ FunctionName: name }).promise()
			return result as AWSLambda.GetFunctionResponse
		} catch (error) {
			if (error?.code != "ResourceNotFoundException") {
				console.warn("Error getting function", { name, error })
				return ERROR
			}
		}
		return null
	}

	async update(configs: AWSLambda.FunctionConfiguration, oldTags: AWSLambda.Tags | undefined, options: FunctionOptions) {
		const {
			name, roleArn, environmentVariables, description, zipLocation, handler, runtime,
			kmsKeyArn, memorySize, timeout, layers, tags
		} = options
		console.log("Updating function", { name })

		const DEFAULT_MEMORY = 128
		const DEFAULT_TIME = 3

		const roleDiff = configs.Role != roleArn
		const handlerDiff = configs.Handler != handler
		const descriptionDiff = (configs.Description ?? "") != (description ?? "")
		const runTimeDiff = (configs.Runtime ?? DEFAULT_RUNTIME) != (runtime ?? DEFAULT_RUNTIME)
		const kmsKeyArnDiff = configs.KMSKeyArn != kmsKeyArn
		const memorySizeDiff = (configs.MemorySize ?? DEFAULT_MEMORY) != (memorySize ?? DEFAULT_MEMORY)
		const timeoutDiff = (configs.Timeout ?? DEFAULT_TIME) != (timeout ?? DEFAULT_TIME)
		const varDiff = !deepEqual(configs.Environment?.Variables, environmentVariables)
		const layersDiff = !deepEqual(configs.Layers, layers)
		const anyDiff = handlerDiff || roleDiff || descriptionDiff || varDiff || runTimeDiff || kmsKeyArnDiff || memorySizeDiff || timeoutDiff || layersDiff

		if (anyDiff) {
			console.log("Updating function configuration", { old: configs, updated: options })
			try {
				const config = await this.awsLambda.updateFunctionConfiguration({
					FunctionName: name,
					Role: roleArn,
					Handler: handler,
					Description: description,
					Runtime: runtime ? runtime : DEFAULT_RUNTIME,
					KMSKeyArn: kmsKeyArn,
					MemorySize: memorySize,
					Timeout: timeout,
					Environment: environmentVariables ? { Variables: { ...environmentVariables } } : undefined,
					Layers: layers
				}).promise()
				configs = { ...config }
			} catch (error) {
				console.warn("Error updating function configuration", { name, roleArn, error})
				return ERROR
			}
		}

		const oldTagKeys = oldTags ? Object.keys(oldTags) : []
		const oldTagsRecord = oldTags ?? {}
		const newTagEntries = tags ? Object.entries(tags) : []
		const newTagsRecord = tags ?? {}
		
		const tagsToRemove = oldTagKeys.filter((key) => {
			return (newTagsRecord[key] == null)
		})

		const tagsToAddOrUpdate: Record<string, string> = {}
		newTagEntries.forEach(([key, value]) => {
			const oldValue = oldTagsRecord[key]
			if (oldValue != value) tagsToAddOrUpdate[key] = value
		})

		if (tagsToRemove.length > 0) {
			console.log("Removing function tags", { tagsToRemove })
			try {
				await this.awsLambda.untagResource({
					Resource: configs.FunctionArn!,
					TagKeys: tagsToRemove
				}).promise()
			} catch (error) {
				console.warn("Error removing tags from function", {
					name, error, tagsToRemove, oldTagsRecord, newTagsRecord
				})
				return ERROR
			}
		}

		if (Object.keys(tagsToAddOrUpdate).length > 1) {
			console.log("Updating function tags", { tagsToAddOrUpdate })
			try{
				await this.awsLambda.tagResource({
					Resource: configs.FunctionArn!,
					Tags: tagsToAddOrUpdate
				}).promise()
			} catch (error) {
				console.warn("Error addting tags to function", {
					name, error, tagsToAddOrUpdate, oldTagsRecord, newTagsRecord
				})
				return ERROR
			}
		}

		const shasum = crypto.createHash('sha256');
		const code = await readFile(zipLocation)
		const sha256 = shasum.update(code).digest('base64')

		if (configs.CodeSha256 != sha256) {
			console.log("Updating function code", { sha256, oldSha256: configs.CodeSha256 })
			try {
				await this.awsLambda.updateFunctionCode({
					FunctionName: name,
					ZipFile: code,
					Publish: true
				}).promise()
			} catch (error) {
				console.warn("Error updating function code", { name, error })
				return ERROR
			}
		}

		return configs
	}

	async create(options: FunctionOptions) {
		const {
			name, roleArn, environmentVariables, description, zipLocation, handler, runtime,
			kmsKeyArn, layers, memorySize, timeout, tags
		} = options
		console.log("Creating function", { name })
		const code = fs.readFileSync(zipLocation)

		try {
			const result = await this.awsLambda.createFunction({
				Code: {
					ZipFile: code
					/*
						Not supported:
						* * ImageUri: 'STRING_VALUE',
						* * S3Bucket: 'STRING_VALUE',
						* * S3Key: 'STRING_VALUE',
						* * S3ObjectVersion: 'STRING_VALUE',
					*/
				},
				FunctionName: name,
				Role: roleArn,
				PackageType: "Zip", // Image not supported
				Publish: true, // Not publishing is unsupported
				Handler: handler,
				Description: description,
				Environment: environmentVariables ? { Variables: { ...environmentVariables } } : undefined,
				Runtime: runtime ? runtime : DEFAULT_RUNTIME,
				KMSKeyArn: kmsKeyArn,
				MemorySize: memorySize,
				Timeout: timeout,
				Layers: layers,
				Tags: tags
				/*
					Not supported:
					* * CodeSigningConfigArn: 'STRING_VALUE',
					* * DeadLetterConfig: { TargetArn: 'STRING_VALUE' },
					* * FileSystemConfigs: [ { Arn: 'STRING_VALUE', LocalMountPath: 'STRING_VALUE' } ]
					* * ImageConfig: { Command: ['STRING'], EntryPoint: ['STRING'], WorkingDirectory: 'STRING' }
					* * TracingConfig: { Mode: Active | PassThrough }
					* * VpcConfig: { SecurityGroupIds: ['STRING'], SubnetIds: ['STRING'] }
				*/
			}).promise()
			return result as AWSLambda.FunctionConfiguration
		} catch (error) {
			console.warn("Error creating function", { name, roleArn, error })
			return ERROR
		}
	}
}
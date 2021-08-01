variable "stack_name" {
  description = "The name of the stack"
  type        = string
}

variable "lambda_name" {
  description = "The main part of the lambda name (full name will include the stack name)"
  type        = string
}

variable "zip_file_path" {
  description = "The path to the zip file to upload"
  type        = string
}

variable "lambda_description" {
  description = "Description for the lambda"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
}

variable "account_number" {
  description = "AWS account number"
  type        = string
}

variable "lambda_handler" {
  description = "The handler for the lambda"
  type        = string
  default     = "dist/index.handler"
}

variable "lambda_runtime" {
  description = "The runtime for the lambda"
  type        = string
  default     = "nodejs14.x"
}
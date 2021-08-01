variable "environment" {
  description = "The environment to be used by the stack"
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

variable "build_path" {
  description = "The path to the build folder to zip"
  type        = string
}

variable "zip_file_path" {
  description = "The path to the zip file to upload"
  type        = string
}

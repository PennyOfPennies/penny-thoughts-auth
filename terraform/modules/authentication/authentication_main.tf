terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.52"
    }
  }

  required_version = ">= 1.0.3"
}

module "lambda" {
  source             = "../lambda"
  stack_name         = "penny_thoughts_auth${var.environment}"
  lambda_name        = "authorize"
  lambda_description = "Lambda for authorizing requests for pennythoughts"
  zip_file_path      = var.zip_file_path
  region             = var.region
  account_number     = var.account_number
}
 
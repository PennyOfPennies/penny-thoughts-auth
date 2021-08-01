terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.52.0"
    }
  }

  required_version = ">= 1.0.3"
}

module "lambda" {
  source             = "github.com/PennyOfPennies/terraform-module-lambda"
  stack_name         = "penny_thoughts_auth${var.environment}"
  lambda_name        = "authorize"
  lambda_description = "Lambda for authorizing requests for pennythoughts"
  region             = "us-east-2"
  account_number     = "276401630934"
  build_path         = "../../dist"
  zip_file_path      = "../../dist.zip"
}

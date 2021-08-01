terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.52"
    }
  }

  required_version = ">= 1.0.3"
}

module "authentication" {
  source         = "../modules/authentication"
  environment    = var.environment
  region         = "us-east-2"
  account_number = "276401630934"
  build_path     = "../../dist"
  zip_file_path  = "../../dist.zip"
}

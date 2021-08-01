terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.52.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.2.0"
    }
  }

  backend "s3" {
    bucket         = "penny-thoughts-terraform-state"
    key            = "penny-thoughts-auth/production/terraform.tfstate"
    region         = "us-east-2"
    dynamodb_table = "terraform-state-locks"
    encrypt        = true
  }

  required_version = ">= 1.0.3"
}

provider "aws" {
  region = "us-east-2"
}

provider "archive" {}

module "common" {
  source      = "../common"
  environment = ""
}

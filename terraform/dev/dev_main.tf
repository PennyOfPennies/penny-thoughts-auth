terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.52"
    }
  }

  backend "s3" {
    bucket         = "penny-thoughts-terraform-state"
    key            = "penny-thoughts-auth/dev/terraform.tfstate"
    region         = "us-east-2"
    dynamodb_table = "terraform-state-locks"
    encrypt        = true
  }

  required_version = ">= 1.0.3"
}

provider "aws" {
  region = "us-east-2"
}

module "authentication" {
  source      = "../common"
  environment = "_dev"
}

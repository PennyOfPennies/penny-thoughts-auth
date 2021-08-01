terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.52"
    }
  }

  required_version = ">= 1.0.3"
}

data "archive_file" "init" {
  type             = "zip"
  source_dir       = var.build_path
  output_file_mode = "0666" # Ensures the same, deterministic output regardless of platform
  output_path      = var.zip_file_path
}

resource "aws_iam_role" "lambda_role" {
  name        = "${var.stack_name}_${var.lambda_name}_role"
  description = "Role assumed by the ${var.stack_name}_${var.lambda_name} lambda"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      },
    ]
  })

  inline_policy {
    name = "access_cloud_watch_policy"

    policy = jsonencode({
      Version = "2012-10-17"
      Statement = [
        {
          Effect   = "Allow"
          Action   = "logs:CreateLogGroup"
          Resource = "arn:aws:logs:${var.region}:${var.account_number}:*"
        },
        {
          Effect = "Allow"
          Action = [
            "logs:CreateLogStream",
            "logs:PutLogEvents"
          ],
          Resource = [
            "arn:aws:logs:${var.region}:${var.account_number}:log-group:/aws/lambda/${var.stack_name}_${var.lambda_name}:*"
          ]
        }
      ]
    })
  }
}

resource "aws_lambda_function" "lambda_function" {
  filename         = var.zip_file_path
  function_name    = "${var.stack_name}_${var.lambda_name}"
  description      = var.lambda_description
  role             = aws_iam_role.lambda_role.arn
  handler          = var.lambda_handler
  source_code_hash = filebase64sha256("${var.zip_file_path}")
  runtime          = var.lambda_runtime
}

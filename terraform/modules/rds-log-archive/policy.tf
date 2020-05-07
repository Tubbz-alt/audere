// Copyright (c) 2018 by Audere
//
// Use of this source code is governed by an LGPL-3.0 license that
// can be found in the LICENSE file distributed with this file.

# resource "aws_iam_instance_profile" "log_archiver" {
#   name = "${local.base_name}-profile"
#   role = "${aws_iam_role.log_archiver.name}"
# }

resource "aws_iam_role" "log_archiver" {
  name = "${local.base_name}"
  assume_role_policy = "${data.aws_iam_policy_document.log_archiver_role_policy.json}"
}

data "aws_iam_policy_document" "log_archiver_role_policy" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

// RDS Log Access

resource "aws_iam_role_policy_attachment" "rds_logs_read" {
  role = "${aws_iam_role.log_archiver.name}"
  policy_arn = "${aws_iam_policy.rds_logs_read.arn}"
}

resource "aws_iam_policy" "rds_logs_read" {
  name = "${local.base_name}-rds-logs-read"
  policy = "${data.aws_iam_policy_document.rds_logs_read.json}"
}

data "aws_iam_policy_document" "rds_logs_read" {
  statement = {
    actions   = [
      "rds:DescribeDBLogFiles",
      "rds:DownloadDBLogFilePortion",
    ]
    resources = ["${data.aws_db_instance.db.db_instance_arn}"]
  }
}

// S3 Access

resource "aws_iam_role_policy_attachment" "s3_write" {
  role = "${aws_iam_role.log_archiver.name}"
  policy_arn = "${aws_iam_policy.s3_write.arn}"
}

resource "aws_iam_policy" "s3_write" {
  name = "${local.base_name}-s3-write"
  policy = "${data.aws_iam_policy_document.s3_write.json}"
}

data "aws_iam_policy_document" "s3_write" {
  statement = {
    actions   = [
      "s3:ListBucket",
      "s3:GetBucketAcl",
    ]
    resources = ["${data.aws_s3_bucket.archive.arn}"]
  }

  statement = {
    actions   = [
      "s3:PutObject",
    ]
    resources = ["${data.aws_s3_bucket.archive.arn}/*"]
  }
}

// CloudTrail logging

resource "aws_iam_role_policy_attachment" "lambda_cloudtrail" {
  role = "${aws_iam_role.log_archiver.name}"
  policy_arn = "${aws_iam_policy.lambda_cloudtrail.arn}"
}

resource "aws_iam_policy" "lambda_cloudtrail" {
  name = "${local.base_name}-lambda-cloudtrail"
  policy = "${data.aws_iam_policy_document.lambda_cloudtrail.json}"
}

data "aws_iam_policy_document" "lambda_cloudtrail" {
  statement {
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DescribeLogGroups",
      "logs:DescribeLogStreams",
    ]

    resources = ["*"]
  }
}

// Data

data "aws_s3_bucket" "archive" {
  bucket = "${var.bucket_name}"
}

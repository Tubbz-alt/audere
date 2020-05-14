// Copyright (c) 2018 by Audere
//
// Use of this source code is governed by an LGPL-3.0 license that
// can be found in the LICENSE file distributed with this file.

locals {
  handler_archive_path = "${path.module}/../../../FluLambda/build/FluLambda.zip"
}

resource "aws_lambda_function" "cron" {
  function_name    = var.name
  filename         = local.handler_archive_path
  handler          = "handler.cronGet"
  runtime          = "nodejs12.x"
  source_code_hash = filebase64sha256(local.handler_archive_path)
  role             = var.role_arn
  timeout          = var.timeout

  environment {
    variables = {
      TARGET_URL = var.url
      TIMEOUT    = var.timeout * 1000
    }
  }

  vpc_config {
    subnet_ids         = [var.subnet_id]
    security_group_ids = var.security_group_ids
  }
}

resource "aws_cloudwatch_metric_alarm" "execution_errors" {
  alarm_name          = "${var.name}-execution-errors"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "60"
  statistic           = "Maximum"
  threshold           = "1"
  treat_missing_data  = "ignore"
  alarm_description   = "This monitors ${var.name} execution failures"

  alarm_actions = [
    var.notification_topic,
  ]

  ok_actions = [
    var.notification_topic,
  ]

  dimensions = {
    FunctionName = aws_lambda_function.cron.function_name
    Resource     = aws_lambda_function.cron.function_name
  }
}

resource "aws_cloudwatch_event_rule" "cron" {
  name                = "${var.name}-cron-events"
  description         = "Fires at ${var.frequency}"
  schedule_expression = var.frequency
}

resource "aws_cloudwatch_event_target" "cron" {
  rule = aws_cloudwatch_event_rule.cron.name
  arn  = aws_lambda_function.cron.arn
}

resource "aws_lambda_permission" "allow_cloudwatch_to_call_cron" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cron.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.cron.arn
}


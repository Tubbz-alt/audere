// Copyright (c) 2018 by Audere
//
// Use of this source code is governed by an LGPL-3.0 license that
// can be found in the LICENSE file distributed with this file.

variable "frequency" {
  description = "Lambda runs at this frequency, e.g. 'rate(1 hour)' or 'rate(5 hours)'"
  type        = string
}

variable "name" {
  description = "Base name used for cron lambda and associated infrastructure"
  type        = string
}

variable "notification_topic" {
  description = "SNS topic for CloudWatch alarms"
  type        = string
}

variable "role_arn" {
  description = "ARN of role lambda should assume"
  type        = string
}

variable "security_group_ids" {
  description = "Security group ids that allow the lambda to access the specified URL"
  type        = list(string)
}

variable "subnet_id" {
  description = "Subnet id the lambda should use to send https requests"
  type        = string
}

variable "timeout" {
  description = "The timeout in seconds for the specified Lambda to complete, defaults to 10"
  type        = string
  default     = 10
}

variable "url" {
  description = "URL to target via https at the specified frequency"
  type        = string
}


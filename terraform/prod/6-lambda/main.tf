// Copyright (c) 2018 by Audere
//
// Use of this source code is governed by an LGPL-3.0 license that
// can be found in the LICENSE file distributed with this file.

terraform {
  backend "s3" {
    bucket = "flu-prod-terraform.auderenow.io"
    key    = "lambda/terraform.state"
    region = "us-west-2"
  }
}

provider "aws" {
  region = "us-west-2"
}

provider "template" {
}

module "flu_lambda" {
  source = "../../modules/flu-lambda"

  chills_virena_bucket_arn    = data.terraform_remote_state.flu_api.outputs.chills_virena_bucket_arn
  chills_virena_bucket_id     = data.terraform_remote_state.flu_api.outputs.chills_virena_bucket_id
  cough_aspren_bucket_arn     = data.terraform_remote_state.flu_api.outputs.cough_aspren_bucket_arn
  cough_aspren_bucket_id      = data.terraform_remote_state.flu_api.outputs.cough_aspren_bucket_id
  cough_follow_ups_bucket_arn = data.terraform_remote_state.flu_api.outputs.cough_follow_ups_bucket_arn
  cough_follow_ups_bucket_id  = data.terraform_remote_state.flu_api.outputs.cough_follow_ups_bucket_id
  environment                 = "prod"
  evidation_bucket_arn        = data.terraform_remote_state.flu_api.outputs.evidation_bucket_arn
  evidation_bucket_id         = data.terraform_remote_state.flu_api.outputs.evidation_bucket_id
  fluapi_fqdn                 = data.terraform_remote_state.flu_api.outputs.fluapi_internal_fqdn
  infra_alerts_sns_topic_arn  = data.terraform_remote_state.flu_notifier.outputs.infra_alerts_sns_topic_arn
  internet_egress_sg          = data.terraform_remote_state.network.outputs.internet_egress_sg_id
  internal_elb_access_sg      = data.terraform_remote_state.network.outputs.fluapi_internal_client_sg_id
  lambda_subnet_id            = data.terraform_remote_state.network.outputs.transient_subnet_id
}

data "terraform_remote_state" "flu_api" {
  backend = "s3"
  config = {
    bucket = "flu-prod-terraform.auderenow.io"
    key    = "api/terraform.state"
    region = "us-west-2"
  }
}

data "terraform_remote_state" "flu_notifier" {
  backend = "s3"
  config = {
    bucket = "flu-prod-terraform.auderenow.io"
    key    = "notifier/terraform.state"
    region = "us-west-2"
  }
}

data "terraform_remote_state" "network" {
  backend = "s3"
  config = {
    bucket = "flu-prod-terraform.auderenow.io"
    key    = "network/terraform.state"
    region = "us-west-2"
  }
}


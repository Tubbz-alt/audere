// Copyright (c) 2019 by Audere
//
// Use of this source code is governed by an LGPL-3.0 license that
// can be found in the LICENSE file distributed with this file.

provider "aws" {
  region = "us-west-2"
}

module "env_network" {
  source = "../../modules/network"

  app_cidr = "${module.vpc_cidr.staging_app_cidr}"
  bastion_cidr_whitelist = "${var.bastion_cidr_whitelist}"
  db_cidr = "${module.vpc_cidr.staging_db_cidr}"
  dev_cidr = "${module.vpc_cidr.staging_dev_cidr}"
  environment = "staging"
  vpc_cidr = "${module.vpc_cidr.vpc_staging_cidr}"
  vpc_flow_log_arn = "${data.terraform_remote_state.global.vpc_flow_log_arn}"
  vpc_flow_log_role_arn = "${data.terraform_remote_state.global.vpc_flow_log_role_arn}"
}

module "vpc_cidr" {
  source = "../../modules/vpc-cidr"
}

data "terraform_remote_state" "global" {
  backend = "s3"
  config {
    bucket = "global-terraform.auderenow.io"
    key = "policy/terraform.state"
    region = "us-west-2"
  }
}

terraform {
  backend "s3" {
    bucket = "flu-staging-terraform.auderenow.io"
    key = "network/terraform.state"
    region = "us-west-2"
  }
}

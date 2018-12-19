// Copyright (c) 2018 by Audere
//
// Use of this source code is governed by an MIT-style license that
// can be found in the LICENSE file distributed with this file.

variable "environment" {
  description = "One of 'staging' or 'prod'"
}

variable "service" {
  description = "Service mode, one of 'offline', 'single', 'elb'"
}

variable "migrate" {
  description = "Cycle this false -> true -> false to run a db migration"
}

variable "subnet_api_cidr" {
  description = "CIDR for private subnet for api tier instances."
  type = "string"
}

variable "subnet_public_cidr" {
  description = "CIDR for public subnet we create for the application load balancer and any other public endpoints."
  type = "string"
}

variable "vpc_id" {
  description = "VPC id for adding subnets"
  type = "string"
}


variable "commit" {
  description = "Git commit tag (or hash) to sync"
  default = "master"
}

variable "creds_snapshot_id" {
  description = "snapshot id of volume containing api credentials"
}

variable "ami_id" {
  description = "ami id to use"
}
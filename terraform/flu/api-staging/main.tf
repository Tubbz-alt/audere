// Copyright (c) 2018 by Audere
//
// Use of this source code is governed by an MIT-style license that
// can be found in the LICENSE file distributed with this file.

locals {
  init_tar_bz2_base64 = "${file("${var.init_tar_bz2_base64_filename}")}"
}

provider "aws" {
  region = "us-west-2"
}

module "ami" { source = "../../modules/ami" }

data "terraform_remote_state" "db" {
  backend = "local"
  config {
    path = "../1-db/terraform.tfstate"
  }
}

data "aws_security_group" "default" { name = "default" }

data "aws_security_group" "http" { name = "http" }

data "aws_security_group" "ssh" { name = "ssh" }

data "aws_acm_certificate" "auderenow_io" {
  domain = "auderenow.io"
  types = ["AMAZON_ISSUED"]
  most_recent = true
}

data "template_file" "sequelize_migrate_sh" {
  template = "${file("./cloud-init.sh")}"
  vars {
    api_port = "${var.flu_api_instance_port}"
    subdomain = "api.staging"
    domain = "api.staging.auderenow.io"
    service_url = "http://localhost:3000"
    commit = "master"
    mode = "migrate"
    init_tar_bz2_base64 = "${local.init_tar_bz2_base64}"
  }
}

data "template_file" "service_init_sh" {
  template = "${file("./cloud-init.sh")}"
  vars {
    api_port = "${var.flu_api_instance_port}"
    subdomain = "api.staging"
    domain = "api.staging.auderenow.io"
    service_url = "http://localhost:3000"
    commit = "master"
    mode = "service"
    init_tar_bz2_base64 = "${local.init_tar_bz2_base64}"
  }
}


// --------------------------------------------------------------------------------
// Sequelize migration

resource "aws_instance" "flu_migrate_instance" {
  ami = "${module.ami.ubuntu}"
  instance_type = "t2.micro"
  key_name = "2018-mmarucheck"
  user_data = "${data.template_file.sequelize_migrate_sh.rendered}"
  vpc_security_group_ids = [
    "${data.aws_security_group.default.id}",
    "${data.aws_security_group.ssh.id}",
  ]

  ebs_block_device {
    device_name = "/dev/sdf"
    snapshot_id = "${data.terraform_remote_state.db.api_staging_snapshot_id}"
  }

  tags {
    Name = "migrate"
  }

  count = "${var.migrate == "true" ? 1 : 0}"
}


// --------------------------------------------------------------------------------
// Single-instance mode

resource "aws_instance" "flu_api_instance" {
  ami = "${module.ami.ubuntu}"
  instance_type = "t2.micro"
  key_name = "2018-mmarucheck"
  user_data = "${data.template_file.service_init_sh.rendered}"
  vpc_security_group_ids = [
    "${data.aws_security_group.default.id}",
    "${data.aws_security_group.ssh.id}",
    "${data.aws_security_group.http.id}",
  ]

  ebs_block_device {
    device_name = "/dev/sdf"
    snapshot_id = "${data.terraform_remote_state.db.api_staging_snapshot_id}"
  }

  tags {
    Name = "staging"
  }

  count = "${var.service == "single" ? 1 : 0}"
}


// --------------------------------------------------------------------------------
// ELB (multi-instance) mode

data "aws_route53_zone" "auderenow_io" {
  name = "auderenow.io."
}

resource "aws_route53_record" "api_staging" {
  zone_id = "${data.aws_route53_zone.auderenow_io.id}"
  name = "api.staging.${data.aws_route53_zone.auderenow_io.name}"
  type = "A"

  alias {
    name = "${aws_elb.flu_api_elb.dns_name}"
    zone_id = "${aws_elb.flu_api_elb.zone_id}"
    evaluate_target_health = true
  }

  count = "${var.service == "elb" ? 1 : 0}"
}

resource "aws_autoscaling_group" "flu_api" {
  launch_configuration = "${aws_launch_configuration.flu_api_instance.id}"
  availability_zones = "${var.availability_zones}"
  load_balancers = ["${aws_elb.flu_api_elb.name}"]
  health_check_type = "ELB"

  min_size = 1
  max_size = 1 # TODO staging

  tag {
    key = "Name"
    value = "flu-api-staging"
    propagate_at_launch = true
  }

  count = "${var.service == "elb" ? 1 : 0}"
}

resource "aws_elb" "flu_api_elb" {
  name = "flu-api-staging"
  availability_zones = "${var.availability_zones}"

  security_groups = [
    "${aws_security_group.flu_api_elb.id}",
    "${data.aws_security_group.default.id}",
  ]

  listener {
    lb_port = 443
    lb_protocol = "https"
    instance_port = 443
    instance_protocol = "https"
    ssl_certificate_id = "${data.aws_acm_certificate.auderenow_io.arn}"
  }

  health_check {
    healthy_threshold = 2
    unhealthy_threshold = 2
    timeout = 10
    interval = 120
    target = "HTTP:${var.flu_api_instance_port}/"
  }

  tags {
    key = "Name"
    value = "flu-api-staging"
  }

  count = "${var.service == "elb" ? 1 : 0}"
}

resource "aws_launch_configuration" "flu_api_instance" {
  image_id = "${module.ami.ubuntu}"
  instance_type = "t2.micro"
  key_name = "2018-mmarucheck" # TODO remove
  user_data = "${data.template_file.service_init_sh.rendered}"

  # TODO: allow https from LB, from dev machines, postgres to db
  security_groups = [
    "${data.aws_security_group.default.id}",
    "${data.aws_security_group.ssh.id}",
    "${aws_security_group.flu_api_instance_from_elb.id}",
  ]

  # TODO: manually create a snapshot so we can tag it
  ebs_block_device {
    device_name = "/dev/sdf"
    snapshot_id = "${data.terraform_remote_state.db.api_staging_snapshot_id}"
  }

  lifecycle {
    create_before_destroy = true
  }

  count = "${var.service == "elb" ? 1 : 0}"
}

resource "aws_security_group" "flu_api_elb" {
  name = "flu-api-elb"

  ingress {
    from_port = 80
    to_port = 80
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port = 443
    to_port = 443
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # TODO: allow egress only to api instances
  egress {
    from_port = 0
    to_port = 0
    protocol = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  count = "${var.service == "elb" ? 1 : 0}"
}

resource "aws_security_group" "flu_api_instance_from_elb" {
  name = "flu-api-instance"

  # TODO: allow ingress only from elb
  ingress {
    from_port = "${var.flu_api_instance_port}"
    to_port = "${var.flu_api_instance_port}"
    protocol = "tcp"
    security_groups = [
      "${aws_security_group.flu_api_elb.id}"
    ]
  }

  lifecycle {
    create_before_destroy = true
  }

  count = "${var.service == "elb" ? 1 : 0}"
}

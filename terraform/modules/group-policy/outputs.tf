// Copyright (c) 2019 by Audere
//
// Use of this source code is governed by an MIT-style license that
// can be found in the LICENSE file distributed with this file.

output "infrastructurers_role_name" {
  value = "${aws_iam_group.infrastructurers.name}"
}
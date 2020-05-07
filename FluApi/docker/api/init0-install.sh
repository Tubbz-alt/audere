#!/bin/bash
# Copyright (c) 2019 by Audere
#
# Use of this source code is governed by an LGPL-3.0 license that
# can be found in the LICENSE file distributed with this file.

set -euxo pipefail
umask 077
SELF_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd)"

if [[ ! -r "./static/buildInfo.json" ]]; then
  echo 1>&2 "Cannot find buildInfo.json."
  echo 1>&2 "Run 'yarn build:gen' in FluApi before 'docker-compose build' here."
  exit 1
fi

time yarn install --frozen-lockfile

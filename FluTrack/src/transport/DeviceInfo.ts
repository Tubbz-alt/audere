// Copyright (c) 2018 by Audere
//
// Use of this source code is governed by an LGPL-3.0 license that
// can be found in the LICENSE file distributed with this file.

import { Constants } from "expo";
import { DeviceInfo } from "audere-lib/snifflesProtocol";

const ios = Constants.platform.ios;

export const DEVICE_INFO: DeviceInfo = {
  installation: Constants.installationId,
  clientVersion: loadBuildInfo(),
  deviceName: Constants.deviceName,
  yearClass: Constants.deviceYearClass,
  idiomText: ios ? ios.userInterfaceIdiom : "unknown",
  platform: JSON.stringify(Constants.platform),
};

function loadBuildInfo() {
  try {
    return require("../../buildInfo.json");
  } catch (e) {
    return `${new Date().toISOString()}.dev-build-without-buildInfo.json`;
  }
}

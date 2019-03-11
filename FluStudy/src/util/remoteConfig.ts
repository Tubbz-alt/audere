// Copyright (c) 2019 by Audere
//
// Use of this source code is governed by an MIT-style license that
// can be found in the LICENSE file distributed with this file.

import firebase from "react-native-firebase";
import { Crashlytics } from "react-native-fabric";
import { tracker, AppHealthEvents } from "../util/tracker";

interface RemoteConfig {
  blockKitOrders: boolean;
}

// Every config you load should have a default set here.  Remember that the
// default needs to make sense for people offline (that is, you should "fail
// safe").
//
// Note: we use Object.assign() to clone this into _currentConfig.  If you add
// properties that aren't shallow, we need to update that code to do a deep
// clone.
const DEFAULT_CONFIGS: RemoteConfig = {
  blockKitOrders: true, // Pessimistically assume we have no kits
};

// Values you put into here will always be applied on top of remote config
// values (merged over) in non-production environments.
const DEV_CONFIG_OVERRIDES = {
  blockKitOrders: false,
};

let _currentConfig: RemoteConfig = Object.assign({}, DEFAULT_CONFIGS);

async function loadConfig() {
  const config = firebase.config();
  const remoteConfigSnapshots = await config.getValues(
    Object.getOwnPropertyNames(DEFAULT_CONFIGS)
  );

  Object.keys(remoteConfigSnapshots).map(key => {
    // @ts-ignore
    _currentConfig[key] = remoteConfigSnapshots[key].val();
  });
  tracker.logEvent(AppHealthEvents.REMOTE_CONFIG_LOADED, _currentConfig);
  Crashlytics.log(`Remote config loaded: ${_currentConfig}`);

  if (process.env.NODE_ENV === "development") {
    _currentConfig = { ..._currentConfig, ...DEV_CONFIG_OVERRIDES };

    tracker.logEvent(AppHealthEvents.REMOTE_CONFIG_OVERRIDDEN, _currentConfig);
    Crashlytics.log(`Remote config overridden: ${_currentConfig}`);
  }
}

// As long as you've awaited loadAllRemoteConfigs, you can call getRemoteConfig
// to load any key from configuration.
export function getRemoteConfig(key: string): any {
  // @ts-ignore
  return _currentConfig[key];
}

export async function loadAllRemoteConfigs() {
  const config = firebase.config();

  if (process.env.NODE_ENV === "development") {
    // This removes all caching and basically fetches the config each time
    config.enableDeveloperMode();
  }

  config.setDefaults(DEFAULT_CONFIGS);

  try {
    await config.fetch(0); // Zero means "always pull from network"

    const activated = await config.activateFetched();

    if (!activated) {
      tracker.logEvent(AppHealthEvents.REMOTE_CONFIG_ERROR, {
        message: "Remote Config not activated",
      });
    }

    await loadConfig();
  } catch (error) {
    const errorMessage = `Remote Config Load Error: ${
      error && error.message ? error.message : error
    }`;

    tracker.logEvent(AppHealthEvents.REMOTE_CONFIG_ERROR, {
      errorMessage,
    });
    Crashlytics.log(errorMessage);
  }
}

// Copyright (c) 2019 by Audere
//
// Use of this source code is governed by an LGPL-3.0 license that
// can be found in the LICENSE file distributed with this file.

module.exports = {
  preset: "jest-expo",
  setupTestFrameworkScriptFile: "./setupJest",
  setupFiles: ["./jestSetup.js"],
  moduleFileExtensions: ["ts", "tsx", "js"],
  transform: {
    "\\.(js)$": "babel-jest",
    "\\.(ts|tsx)$": "ts-jest",
  },
  testMatch: [
    "**/__tests__/**/*.(ts|js)?(x)",
    "**/?(*.)+(spec|test).(ts|js)?(x)",
  ],
  testPathIgnorePatterns: ["\\.snap$", "<rootDir>/node_modules/", "appium.*"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-|pouchdb-)?react-native|(@)?expo|(@)?react-navigation|pouchdb-adapter-asyncstorage|@react-native-community/netinfo))",
  ],
};

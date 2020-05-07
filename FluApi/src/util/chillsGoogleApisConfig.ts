// Copyright (c) 2019 by Audere
//
// Use of this source code is governed by an LGPL-3.0 license that
// can be found in the LICENSE file distributed with this file.

import { SecretConfig } from "./secretsConfig";

export interface ChillsGoogleApisConfig {
  refreshToken: string;
  spreadsheetId: string;
  demoSpreadsheetId: string;
  triggersSpreadsheetId: string;
  clientId: string;
  clientSecret: string;
}

export async function getGoogleApisConfig(
  secrets: SecretConfig
): Promise<ChillsGoogleApisConfig> {
  const [
    refreshToken,
    spreadsheetId,
    demoSpreadsheetId,
    triggersSpreadsheetId,
    clientId,
    clientSecret,
  ] = await Promise.all([
    secrets.get("CHILLS_GOOGLE_APIS_REFRESH_TOKEN"),
    secrets.get("CHILLS_KITS_GOOGLE_SHEETS_ID"),
    secrets.get("CHILLS_DEMO_KITS_GOOGLE_SHEETS_ID"),
    secrets.get("CHILLS_TRIGGERS_KIT_GOOGLE_SHEETS_ID"),
    secrets.get("CHILLS_GOOGLE_APIS_CLIENT_ID"),
    secrets.get("CHILLS_GOOGLE_APIS_CLIENT_SECRET"),
  ]);

  return {
    refreshToken,
    spreadsheetId,
    demoSpreadsheetId,
    triggersSpreadsheetId,
    clientId,
    clientSecret,
  };
}

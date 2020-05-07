// Copyright (c) 2018 by Audere
//
// Use of this source code is governed by an LGPL-3.0 license that
// can be found in the LICENSE file distributed with this file.

import { SecretConfig } from "./secretsConfig";

export interface S3Config {
  fluReportsBucket: string;
  asprenReportsBucket: string;
  coughFollowUpBucket: string;
  virenaRecordsBucket: string;
  fileshareBucket: string;
  evidationBucket: string;
}

let lazy: Promise<S3Config> | null = null;

export function getS3Config(secrets: SecretConfig): Promise<S3Config> {
  if (lazy != null) {
    return lazy;
  }
  lazy = createConfig(secrets);
  return lazy;
}

async function createConfig(secrets: SecretConfig): Promise<S3Config> {
  const [
    fluReportsBucket,
    asprenReportsBucket,
    coughFollowUpBucket,
    virenaRecordsBucket,
    fileshareBucket,
    evidationBucket,
  ] = await Promise.all([
    secrets.get("S3_REPORT_BUCKET"),
    secrets.get("S3_ASPREN_BUCKET"),
    secrets.get("S3_COUGH_FOLLOW_UPS_BUCKET"),
    secrets.get("S3_VIRENA_BUCKET"),
    secrets.get("S3_FILESHARE_BUCKET"),
    secrets.get("S3_EVIDATION_BUCKET"),
  ]);
  return {
    fluReportsBucket,
    asprenReportsBucket,
    coughFollowUpBucket,
    virenaRecordsBucket,
    fileshareBucket,
    evidationBucket,
  };
}

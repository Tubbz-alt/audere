// Copyright (c) 2019 by Audere
//
// Use of this source code is governed by an MIT-style license that
// can be found in the LICENSE file distributed with this file.

import { Sequelize } from "sequelize";
import {
  Inst,
  Model,
  SplitSql,
  booleanColumn,
  dateColumn,
  defineModel,
  integerColumn,
  jsonColumn,
  stringColumn,
  unique,
} from "../../util/sql";
import {
  DeviceInfo,
  PhotoDbInfo,
  SurveyNonPIIInfo,
} from "audere-lib/dist/chillsProtocol";

const schema = "chills";

export function defineChillsModels(sql: SplitSql): ChillsModels {
  const models: ChillsModels = {
    accessKey: defineAccessKey(sql),
    expertRead: defineExpertRead(sql),
    importProblem: defineImportProblem(sql),
    photo: definePhoto(sql),
    photoReplacementLog: definePhotoReplacementLog(sql),
    photoUploadLog: definePhotoUploadLog(sql),
    survey: defineSurvey(sql.nonPii),
  };

  models.survey.hasOne(models.photoUploadLog, {
    foreignKey: "chills_survey_id",
    onDelete: "CASCADE",
  });
  models.survey.hasOne(models.expertRead, {
    foreignKey: "surveyId",
    onDelete: "CASCADE",
  });

  return models;
}

export interface ChillsModels {
  accessKey: Model<AccessKeyAttributes>;
  expertRead: Model<ExpertReadAttributes>;
  importProblem: Model<ImportProblemAttributes>;
  photo: Model<PhotoAttributes>;
  photoReplacementLog: Model<PhotoReplacementLogAttributes>;
  photoUploadLog: Model<PhotoUploadLogAttributes>;
  survey: Model<SurveyAttributes<SurveyNonPIIInfo>>;
}

// ---------------------------------------------------------------

// Screens/Surveys can be fixed up later.  We therefore have a current
// table that keeps the live data, and a backup table that keeps originals
// if a fixup has been applied.
export enum EditableTableType {
  CURRENT = "current",
  BACKUP = "backup",
}

// ---------------------------------------------------------------

export interface AccessKeyAttributes {
  id?: string;
  key: string;
  valid: boolean;
}
export function defineAccessKey(sql: SplitSql): Model<AccessKeyAttributes> {
  return defineModel<AccessKeyAttributes>(
    sql.nonPii,
    "access_keys",
    {
      key: stringColumn(),
      valid: booleanColumn(),
    },
    { schema }
  );
}

// ---------------------------------------------------------------

export interface ImportProblemAttributes {
  id?: string;
  firebaseId: string;
  firebaseCollection: string;
  attempts: number;
  lastError: string;
}
export function defineImportProblem(
  sql: SplitSql
): Model<ImportProblemAttributes> {
  return defineModel<ImportProblemAttributes>(
    sql.nonPii,
    "import_problems",
    {
      firebaseId: stringColumn("firebase_id"),
      firebaseCollection: stringColumn("firebase_collection"),
      attempts: integerColumn(),
      lastError: stringColumn("last_error"),
    },
    { schema }
  );
}

// ---------------------------------------------------------------

export interface PhotoAttributes {
  id?: string;
  docId: string;
  device: DeviceInfo;
  photo: PhotoDbInfo;
}
export function definePhoto(sql: SplitSql): Model<PhotoAttributes> {
  return defineModel<PhotoAttributes>(
    sql.nonPii,
    "photos",
    {
      docId: unique(stringColumn("docid")),
      device: jsonColumn(),
      photo: jsonColumn(),
    },
    { schema }
  );
}

// ---------------------------------------------------------------

export interface PhotoUploadLogAttributes {
  id?: string;
  surveyId: string;
}
export function definePhotoUploadLog(
  sql: SplitSql
): Model<PhotoUploadLogAttributes> {
  return defineModel<PhotoUploadLogAttributes>(
    sql.nonPii,
    "photo_upload_log",
    {
      surveyId: unique(stringColumn("chills_survey_id")),
    },
    { schema }
  );
}

// ---------------------------------------------------------------

export interface SurveyAttributes<Info> {
  id?: string;
  docId: string;
  device: DeviceInfo;
  survey: Info;
  expert_read?: ExpertReadAttributes;
  updatedAt?: Date;
  createdAt?: Date;
}
export function defineSurvey<Info>(
  sql: Sequelize,
  editableType = EditableTableType.CURRENT
): SurveyModel<Info> {
  return defineModel<SurveyAttributes<Info>>(
    sql,
    `${editableType}_surveys`,
    {
      docId: unique(stringColumn("docid")),
      device: jsonColumn(),
      survey: jsonColumn(),
      updatedAt: dateColumn(),
      createdAt: dateColumn(),
    },
    { schema }
  );
}
export type SurveyInstance<Info> = Inst<SurveyAttributes<Info>>;
export type SurveyModel<Info> = Model<SurveyAttributes<Info>>;

// ---------------------------------------------------------------

export interface ExpertReadAttributes {
  surveyId: number;
  interpretation: string;
  interpreterId: number;
}

export function defineExpertRead(sql: SplitSql): Model<ExpertReadAttributes> {
  return defineModel<ExpertReadAttributes>(
    sql.nonPii,
    "expert_read",
    {
      surveyId: unique(integerColumn("surveyId")),
      interpretation: stringColumn("interpretation"),
      interpreterId: integerColumn("interpreterId"),
    },
    { schema }
  );
}

// ---------------------------------------------------------------

export interface PhotoReplacementLogAttributes {
  photoId: number;
  oldPhotoHash: string;
  newPhotoHash: string;
  replacerId: number;
}

export function definePhotoReplacementLog(
  sql: SplitSql
): Model<PhotoReplacementLogAttributes> {
  return defineModel<PhotoReplacementLogAttributes>(
    sql.nonPii,
    "photo_replacement_log",
    {
      photoId: unique(integerColumn("photoId")),
      oldPhotoHash: stringColumn("oldPhotoHash"),
      newPhotoHash: stringColumn("newPhotoHash"),
      replacerId: unique(integerColumn("replacerId")),
    },
    { schema }
  );
}

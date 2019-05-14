// Copyright (c) 2018 by Audere
//
// Use of this source code is governed by an MIT-style license that
// can be found in the LICENSE file distributed with this file.

import {
  DocumentType,
  SurveyInfo,
  AnalyticsInfo,
  PhotoInfo,
} from "audere-lib/coughProtocol";

// Wrapper document saved in PouchDB.
export interface PouchDoc {
  _id: string;

  docId: string;
  document: DocumentContents;
  documentType: DocumentType;

  // Note that attachments are not encrypted at rest on device.
  _attachments?: PouchAttachmentObject;
}

export type PouchAttachmentObject = UniformObject<PouchAttachment>;

export interface PouchAttachment {
  content_type: "text/plain";
  data: string;
}

export interface UniformObject<T> {
  [key: string]: T;
}

export type DocumentContents = SurveyInfo | AnalyticsInfo | PhotoInfo;
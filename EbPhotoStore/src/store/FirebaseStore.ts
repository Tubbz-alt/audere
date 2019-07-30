// Copyright (c) 2019 by Audere
//
// Use of this source code is governed by an MIT-style license that
// can be found in the LICENSE file distributed with this file.

import RNDeviceInfo from "react-native-device-info";
import firebase from "react-native-firebase";
import RNFS from "react-native-fs";
import {
  FirestoreProtocolDocument,
  DocumentType,
  EncounterDocument,
  EncounterInfo,
  EncounterTriageDocument
} from "audere-lib/ebPhotoStoreProtocol";

const DEFAULT_ENCOUNTER_COLLECTION = "encounters";
const DEFAULT_TRIAGE_COLLECTION = "triages";

const DEVICE_INFO = {
  installation: RNDeviceInfo.getInstanceID(),
  clientVersion: loadBuildInfo(),
  clientBuild: RNDeviceInfo.getBuildNumber(),
  idiomText: RNDeviceInfo.getDeviceType(),
  platform: {
    osName: RNDeviceInfo.getSystemName(),
    osVersion: RNDeviceInfo.getSystemVersion()
  }
};

function loadBuildInfo() {
  try {
    return require("../../buildInfo.json");
  } catch (e) {
    return `${new Date().toISOString}.dev-build-without-buildInfo.json`;
  }
}

function getEncounterCollection() {
  const collectionName =
    process.env.FIRESTORE_ENCOUNTER_COLLECTION || DEFAULT_ENCOUNTER_COLLECTION;
  return firebase.firestore().collection(collectionName);
}

function getTriageCollection() {
  const collectionName =
    process.env.FIRESTORE_TRIAGE_COLLECTION || DEFAULT_TRIAGE_COLLECTION;
  return firebase.firestore().collection(collectionName);
}

export async function initializeFirestore() {
  // This enables offline caching
  await firebase.firestore().settings({ persistence: true });
}

export async function syncEncounter(docId: string, encounter: EncounterInfo) {
  const encounterDocument = frame({
    schemaId: 1,
    docId,
    device: DEVICE_INFO,
    documentType: DocumentType.Encounter,
    encounter
  });
  const doc = getEncounterCollection().doc(docId);
  console.log(`Uploading encounter ${docId}`);
  await doc.set(encounterDocument);
}

function frame(document: EncounterDocument): FirestoreProtocolDocument {
  return {
    ...document,
    _transport: {
      sentAt: new Date().toISOString(),
      lastWriter: "sender",
      protocolVersion: 1
    }
  };
}

export async function initializeListener(
  callback: (doc: EncounterTriageDocument) => void
) {
  getTriageCollection().onSnapshot(collection => {
    collection.docChanges.forEach(docChange => {
      const doc = docChange.doc.data() as EncounterTriageDocument;
      callback(doc);
    });
  });
}

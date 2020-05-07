// Copyright (c) 2019 by Audere
//
// Use of this source code is governed by an LGPL-3.0 license that
// can be found in the LICENSE file distributed with this file.

import firebase from "react-native-firebase";
import NetInfo from "@react-native-community/netinfo";
import {
  Action,
  PhotoUpload,
  PhotoUploadState,
  getStore,
  startPhotoUpload,
  retryPhotoUpload,
  photoUploadFailed,
  photoUploadFinished,
} from "../store";

NetInfo.addEventListener(state => {
  if (state.isInternetReachable) {
    retryUploads();
  }
});

export async function startUpload(
  photoId: string,
  uri: string,
  patientId: number
) {
  console.log(photoId + ": " + uri);
  const store = await getStore();
  store.dispatch(startPhotoUpload(photoId, uri, patientId));
  uploadPhoto(photoId, uri);
}

export async function retryUploads(force = false) {
  const store = await getStore();
  const photoUploads: PhotoUploadState = store.getState().photoUploads;
  Object.values(photoUploads)
    .filter(
      photoUpload =>
        photoUpload.uploadState == PhotoUploadState.FAILED ||
        (force && photoUpload.uploadState === PhotoUploadState.UPLOADING)
    )
    .map(photoUpload => retryUpload(photoUpload.photoId));
}

async function retryUpload(photoUpload: PhotoUpload) {
  const store = await getStore();
  store.dispatch(retryPhotoUpload(photoUpload.photoId));
  uploadPhoto(photoUpload.photoId, photoUpload.localUri);
}

async function uploadPhoto(photoId: string, uri: string) {
  const store = await getStore();
  try {
    await firebase
      .storage()
      .ref()
      .child(`photos/${photoId}.jpg`)
      .putFile(uri, { contentType: "image/jpeg" });
  } catch (e) {
    console.warn(`Failed to upload ${photoId}`);
    console.warn(e);
    store.dispatch(photoUploadFailed(photoId, e.message));
    return;
  }

  store.dispatch(photoUploadFinished(photoId));
}

export function hasPendingPhotos(state: any) {
  const photoUploads: PhotoUploadState = state.photoUploads;
  const keys = Object.keys(photoUploads);

  for (let i = 0; i < keys.length; i++) {
    if (
      (photoUploads as any)[keys[i]].uploadState !== PhotoUploadState.UPLOADED
    ) {
      return true;
    }
  }
  return false;
}

// Copyright (c) 2019 by Audere
//
// Use of this source code is governed by an LGPL-3.0 license that
// can be found in the LICENSE file distributed with this file.

import { uploader } from "./store/uploader";
import { ErrorRecovery } from "expo";

export type ErrorProps = {
  errorMessage: string;
};

let defaultErrorHandler = (error: Error, isFatal?: boolean) => {};

export function uploadingErrorHandler(e: Error, isFatal?: boolean) {
  const errorMessage = e.message + "\n" + e.stack;
  if (isFatal) {
    const errorProps: ErrorProps = { errorMessage };
    ErrorRecovery.setRecoveryProps(errorProps);
  } else {
    uploader.saveCrashLog(errorMessage);
  }
  defaultErrorHandler(e, isFatal);
}

export function setupErrorHandler() {
  defaultErrorHandler = ErrorUtils.getGlobalHandler();
  if (defaultErrorHandler !== uploadingErrorHandler) {
    ErrorUtils.setGlobalHandler(uploadingErrorHandler);
  }
}

export function reportPreviousCrash(errorProps?: ErrorProps) {
  if (!errorProps) {
    return;
  }
  uploader.saveCrashLog(errorProps.errorMessage);
}

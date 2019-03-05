// Copyright (c) 2018 by Audere
//
// Use of this source code is governed by an MIT-style license that
// can be found in the LICENSE file distributed with this file.

import { createSplitSql } from "./util/sql";
import { createPublicApp, createInternalApp } from "./app";
import dotenv from "dotenv";

dotenv.config();

const sql = createSplitSql();
sql.nonPii.authenticate();
sql.pii.authenticate();

const publicApp = createPublicApp(sql);

publicApp.listen(publicApp.get("port"), () => {
  console.log(
    "Public app is running at http://localhost:%d in %s mode",
    publicApp.get("port"),
    publicApp.get("env")
  );
});

const internalApp = createInternalApp(sql);

internalApp.listen(internalApp.get("port"), () => {
  console.log(
    "Internal app is running at http://localhost:%d in %s mode",
    internalApp.get("port"),
    internalApp.get("env")
  );
});

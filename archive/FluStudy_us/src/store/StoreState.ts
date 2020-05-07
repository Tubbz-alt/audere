// Copyright (c) 2018 by Audere
//
// Use of this source code is governed by an LGPL-3.0 license that
// can be found in the LICENSE file distributed with this file.

import { default as meta, MetaState, MetaAction } from "./meta";
import { default as survey, SurveyState, SurveyAction } from "./survey";

export interface StoreState {
  meta: MetaState;
  navigation: any;
  survey: SurveyState;
}

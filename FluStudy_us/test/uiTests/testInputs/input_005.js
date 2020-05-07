// Copyright (c) 2019 by Audere
//
// Use of this source code is governed by an LGPL-3.0 license that
// can be found in the LICENSE file distributed with this file.

import strings from "../../../src/i18n/locales/en.json";
const today = new Date();

export const inputs = {
  [strings.barcode.placeholder]: "ID19111305",
  [strings.common.emailEntry.placeholder]: "fake5@auderenow.org",
  [strings.surveyTitle.whatSymptoms]: [
    strings.surveyOption.sweats,
    strings.surveyOption.fatigue,
  ],
  [strings.surveyTitle.symptomsSeverity]: [
    strings.surveyButton.moderate,
    strings.surveyButton.severe,
  ],
  [strings.surveyTitle.whenFirstNoticedIllness]: "none",
  [strings.surveyTitle.howLongToSickest]: strings.surveyButton["4Days"],
  [strings.surveyTitle.fluOrCold]: strings.surveyButton.commonCold,
  [strings.surveyTitle.worseOrDifferentFromTypical]: strings.surveyButton.yes,
  [strings.surveyTitle.antiviral]: strings.surveyButton.yesButDontKnowWhich,
  [strings.surveyTitle.whenFirstStartedAntiviral]: "none",
  [strings.surveyTitle.fluShot]: strings.surveyButton.no,
  [strings.surveyTitle.affectedRegularActivities]:
    strings.surveyButton.veryMuch,
  [strings.surveyTitle.smokeTobacco]: strings.surveyButton.yes,
  [strings.surveyTitle.householdTobacco]: strings.surveyButton.yes,
  [strings.surveyTitle.travelOutsideState.replace("{{state}}", "MA")]: strings
    .surveyButton.yes,
  [strings.surveyTitle.travelOutsideUS]: strings.surveyButton.yes,
  [strings.surveyTitle.whichCountriesOutsideUS]:
    "Mexico, Costa Rica, Nicaragua",
  [strings.surveyTitle.peopleInHousehold]: strings.surveyButton.five,
  [strings.surveyTitle.childrenAgeGroups]: [
    strings.surveyOption.olderThanTwelve,
  ],
  [strings.surveyTitle.someoneDiagnosed]: strings.surveyButton.yes,
  [strings.surveyTitle.inContact]: strings.surveyButton.no,
  [strings.surveyTitle.publicTransportation]: strings.surveyButton.no,
  [strings.surveyTitle.aroundSickChildren]: strings.surveyButton.no,
  [strings.surveyTitle.futureStudies]: strings.surveyButton.yes,
  [strings.surveyTitle.blueLine]: strings.surveyButton.yes,
  [strings.surveyTitle.pinkLine]: strings.surveyButton.noPink,
  state: "MA",
};

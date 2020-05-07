// Copyright (c) 2019 by Audere
//
// Use of this source code is governed by an LGPL-3.0 license that
// can be found in the LICENSE file distributed with this file.

import i18n from "i18next";
import enStrings from "./locales/en.json";
import frStrings from "./locales/fr.json";

const languageDetector = {
  type: "languageDetector",
  async: false,
  detect: () => window.navigator.language,
  init: () => {},
  cacheUserLanguage: () => {},
};
i18n.use(languageDetector).init({
  fallbackLng: "en",
  resources: {
    en: enStrings,
    fr: frStrings,
  },
  ns: ["common"],
  defaultNS: "common",
  interpolation: {
    escapeValue: false,
  },
  react: {
    bindI18n: "languageChanged",
    bindStore: false,
  },
});
export default i18n;

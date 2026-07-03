import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import es from "./es.json";

const deviceLang = Localization.getLocales()[0]?.languageCode ?? "es";
const fallback = ["es", "en"].includes(deviceLang) ? deviceLang : "es";

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: fallback,
  fallbackLng: "es",
  interpolation: { escapeValue: false },
});

export default i18n;

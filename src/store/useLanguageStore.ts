import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import i18n from "../i18n";

const LANG_KEY = "paseoapp_language";

type Language = "es" | "en";

interface LanguageStore {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useLanguageStore = create<LanguageStore>((set) => ({
  language: "es",

  setLanguage: async (lang) => {
    set({ language: lang });
    await i18n.changeLanguage(lang);
    await AsyncStorage.setItem(LANG_KEY, lang);
  },

  hydrate: async () => {
    const stored = (await AsyncStorage.getItem(LANG_KEY)) as Language | null;
    if (stored && ["es", "en"].includes(stored)) {
      set({ language: stored });
      await i18n.changeLanguage(stored);
    }
  },
}));

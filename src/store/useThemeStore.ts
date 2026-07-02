import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const STORAGE_KEY = "paseoapp_follow_system_theme";

interface ThemeStore {
  followSystem: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setFollowSystem: (value: boolean) => Promise<void>;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  followSystem: true,
  hydrated: false,

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const followSystem = stored === null ? true : stored === "true";
      set({ followSystem, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  setFollowSystem: async (value: boolean) => {
    set({ followSystem: value });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, String(value));
    } catch {}
  },
}));

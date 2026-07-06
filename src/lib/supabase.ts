import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";
import type { Database } from "./database.types";

// ─────────────────────────────────────────────
// Web: usa localStorage para persistir la sesión
// ─────────────────────────────────────────────
const WebStorageAdapter = {
  getItem: (key: string): Promise<string | null> => {
    try {
      return Promise.resolve(
        typeof localStorage !== "undefined" ? localStorage.getItem(key) : null,
      );
    } catch {
      return Promise.resolve(null);
    }
  },
  setItem: (key: string, value: string): Promise<void> => {
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
    } catch {}
    return Promise.resolve();
  },
  removeItem: (key: string): Promise<void> => {
    try {
      if (typeof localStorage !== "undefined") localStorage.removeItem(key);
    } catch {}
    return Promise.resolve();
  },
};

// ─────────────────────────────────────────────
// Native: SecureStore con chunking (límite 2KB por clave)
// ─────────────────────────────────────────────
const CHUNK_SIZE = 1800;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SecureStore = Platform.OS !== "web" ? require("expo-secure-store") : null;

const ChunkedSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (!SecureStore) return null;
    try {
      const single = await SecureStore.getItemAsync(key);
      if (single !== null) return single;

      const countStr = await SecureStore.getItemAsync(`${key}_count`);
      if (!countStr) return null;

      const count = parseInt(countStr, 10);
      let result = "";
      for (let i = 0; i < count; i++) {
        const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
        if (chunk === null) return null;
        result += chunk;
      }
      return result;
    } catch {
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (!SecureStore) return;
    try {
      if (value.length <= CHUNK_SIZE) {
        await SecureStore.setItemAsync(key, value);
        const oldCountStr = await SecureStore.getItemAsync(`${key}_count`);
        if (oldCountStr) {
          const oldCount = parseInt(oldCountStr, 10);
          for (let i = 0; i < oldCount; i++) {
            await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
          }
          await SecureStore.deleteItemAsync(`${key}_count`);
        }
        return;
      }

      await SecureStore.deleteItemAsync(key);
      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE));
      }

      const oldCountStr = await SecureStore.getItemAsync(`${key}_count`);
      if (oldCountStr) {
        const oldCount = parseInt(oldCountStr, 10);
        for (let i = chunks.length; i < oldCount; i++) {
          await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
        }
      }

      for (let i = 0; i < chunks.length; i++) {
        await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunks[i]);
      }
      await SecureStore.setItemAsync(`${key}_count`, String(chunks.length));
    } catch (e) {
      console.error("SecureStore setItem error:", e);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    if (!SecureStore) return;
    try {
      await SecureStore.deleteItemAsync(key);
      const countStr = await SecureStore.getItemAsync(`${key}_count`);
      if (countStr) {
        const count = parseInt(countStr, 10);
        for (let i = 0; i < count; i++) {
          await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
        }
        await SecureStore.deleteItemAsync(`${key}_count`);
      }
    } catch (e) {
      console.error("SecureStore removeItem error:", e);
    }
  },
};

// ─────────────────────────────────────────────
// Cliente Supabase
// ─────────────────────────────────────────────
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === "web" ? WebStorageAdapter : ChunkedSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});

// AppState management is handled centrally in useAuthStore.initialize()
// to avoid duplicate listeners and allow proper cleanup.

import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { AppState } from "react-native";
import "react-native-url-polyfill/auto";

// ─────────────────────────────────────────────
// SecureStore tiene un límite de 2048 bytes por clave.
// El JWT de Supabase supera ese límite, así que lo dividimos
// en chunks y los guardamos/recuperamos por partes.
// ─────────────────────────────────────────────
const CHUNK_SIZE = 1800; // bytes seguros por debajo del límite

const ChunkedSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      // Intentar primero sin chunks (compatibilidad hacia atrás)
      const single = await SecureStore.getItemAsync(key);
      if (single !== null) return single;

      // Leer chunks
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
    try {
      if (value.length <= CHUNK_SIZE) {
        // Valor pequeño — guardar directamente
        await SecureStore.setItemAsync(key, value);
        // Limpiar chunks viejos si existían
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

      // Valor grande — dividir en chunks
      // Limpiar valor simple si existía
      await SecureStore.deleteItemAsync(key);

      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE));
      }

      // Limpiar chunks viejos
      const oldCountStr = await SecureStore.getItemAsync(`${key}_count`);
      if (oldCountStr) {
        const oldCount = parseInt(oldCountStr, 10);
        for (let i = chunks.length; i < oldCount; i++) {
          await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
        }
      }

      // Guardar nuevos chunks
      for (let i = 0; i < chunks.length; i++) {
        await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunks[i]);
      }
      await SecureStore.setItemAsync(`${key}_count`, String(chunks.length));
    } catch (e) {
      console.error("SecureStore setItem error:", e);
    }
  },

  removeItem: async (key: string): Promise<void> => {
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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ChunkedSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});

// Pausa/reanuda el refresh del token según el estado de la app
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

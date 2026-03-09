import { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { supabase } from "../lib/supabase";

interface AuthStore {
  session: Session | null;
  user: User | null;
  persona: { id: string; nombre: string; email: string } | null;
  loading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  signUp: (email: string, password: string, nombre: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  session: null,
  user: null,
  persona: null,
  loading: true,
  error: null,

  initialize: async () => {
    set({ loading: true });

    // Get current session
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      set({ session, user: session.user });
      await loadPersona(session.user.id, set);
    }

    // Listen for auth changes (handles email confirmation deep link)
    supabase.auth.onAuthStateChange(async (event, session) => {
      set({ session, user: session?.user ?? null });
      if (session?.user) {
        await loadPersona(session.user.id, set);
      } else {
        set({ persona: null });
      }

      if (event === "SIGNED_IN") {
        set({ loading: false });
      }
    });

    set({ loading: false });
  },

  signUp: async (email, password, nombre) => {
    set({ error: null });

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      set({ error: error.message });
      return false;
    }
    if (!data.user) return false;

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check if a persona with this email already exists (manually added)
    const { data: existing } = await supabase
      .from("personas")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      // Merge — link the existing persona to this auth account
      const { error: mergeError } = await supabase
        .from("personas")
        .update({ auth_user_id: data.user.id, nombre })
        .eq("id", existing.id);
      if (mergeError) {
        set({ error: mergeError.message });
        return false;
      }
    } else {
      // Create new persona
      const { error: personaError } = await supabase
        .from("personas")
        .insert({ nombre, email, auth_user_id: data.user.id });
      if (personaError) {
        set({ error: personaError.message });
        return false;
      }
    }

    await loadPersona(data.user.id, set);
    return true;
  },

  signIn: async (email, password) => {
    set({ error: null });
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      set({ error: error.message });
      return false;
    }
    return true;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, persona: null });
  },
}));

// Helper to load persona from personas table
async function loadPersona(authUserId: string, set: any) {
  const { data } = await supabase
    .from("personas")
    .select("id, nombre, email")
    .eq("auth_user_id", authUserId)
    .single();
  if (data) set({ persona: data });
}

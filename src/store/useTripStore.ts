import { create } from "zustand";
import { supabase } from "../lib/supabase";

export interface Persona {
  id: string;
  nombre: string;
}

export interface AsistenciaComida {
  id?: string;
  fecha: string;
  tipo_comida: string;
  asiste: boolean;
}

export interface Participacion {
  id?: string;
  paseo_id?: string;
  persona_id: string;
  unidad_familiar: number;
  factor: number;
  puso: number;
  persona?: Persona;
  asistencia?: AsistenciaComida[];
}

export interface Paseo {
  id?: string;
  nombre: string;
  lugar: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  codigo_invitacion?: string;
  participaciones?: Participacion[];
}

interface TripStore {
  paseos: Paseo[];
  personas: Persona[];
  loading: boolean;
  error: string | null;
  fetchPaseos: () => Promise<void>;
  fetchPersonas: () => Promise<void>;
  crearPaseo: (paseo: Omit<Paseo, "id">) => Promise<Paseo | null>;
  crearPersona: (nombre: string) => Promise<Persona | null>;
  agregarParticipacion: (p: Participacion) => Promise<void>;
  guardarAsistencia: (
    participacion_id: string,
    asistencia: AsistenciaComida[],
  ) => Promise<void>;
}

export const useTripStore = create<TripStore>((set) => ({
  paseos: [],
  personas: [],
  loading: false,
  error: null,

  fetchPaseos: async () => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from("paseos")
      .select("*")
      .order("fecha_inicio", { ascending: false });
    if (error) {
      set({ error: error.message, loading: false });
      return;
    }
    set({ paseos: data ?? [], loading: false });
  },

  fetchPersonas: async () => {
    const { data, error } = await supabase
      .from("personas")
      .select("*")
      .order("nombre");
    if (error) return;
    set({ personas: data ?? [] });
  },

  crearPaseo: async (paseo) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from("paseos")
      .insert(paseo)
      .select()
      .single();
    if (error) {
      set({ error: error.message, loading: false });
      return null;
    }
    set((state) => ({ paseos: [data, ...state.paseos], loading: false }));
    return data;
  },

  crearPersona: async (nombre) => {
    const { data, error } = await supabase
      .from("personas")
      .insert({ nombre })
      .select()
      .single();
    if (error) return null;
    set((state) => ({ personas: [...state.personas, data] }));
    return data;
  },

  agregarParticipacion: async (p) => {
    const { error } = await supabase.from("participaciones").insert(p);
    if (error) console.error(error.message);
  },

  guardarAsistencia: async (participacion_id, asistencia) => {
    const rows = asistencia.map((a) => ({ ...a, participacion_id }));
    const { error } = await supabase
      .from("asistencia_comidas")
      .upsert(rows, { onConflict: "participacion_id,fecha,tipo_comida" });
    if (error) console.error(error.message);
  },
}));

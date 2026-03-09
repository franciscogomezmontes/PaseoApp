import { create } from "zustand";
import { supabase } from "../lib/supabase";

export interface Ingrediente {
  id: string;
  nombre: string;
  unidad_base: string;
  categoria: string;
  observaciones?: string;
}

export interface RecetaIngrediente {
  id: string;
  ingrediente_id: string;
  cantidad_por_porcion: number;
  ingredientes: Ingrediente;
}

export interface Receta {
  id: string;
  nombre: string;
  tipo_comida: string;
  porciones_base: number;
  descripcion?: string;
  es_publica: boolean;
  receta_ingredientes?: RecetaIngrediente[];
}

interface RecipeStore {
  recetas: Receta[];
  loading: boolean;
  error: string | null;
  fetchRecetas: () => Promise<void>;
  fetchRecetaById: (id: string) => Promise<Receta | null>;
  agregarReceta: (receta: Omit<Receta, "id">) => Promise<void>;
}

export const useRecipeStore = create<RecipeStore>((set) => ({
  recetas: [],
  loading: false,
  error: null,

  fetchRecetas: async () => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from("recetas")
      .select("*")
      .order("tipo_comida")
      .order("nombre");

    if (error) {
      set({ error: error.message, loading: false });
      return;
    }
    set({ recetas: data ?? [], loading: false });
  },

  fetchRecetaById: async (id) => {
    const { data, error } = await supabase
      .from("recetas")
      .select(
        `
        *,
        receta_ingredientes (
          id,
          cantidad_por_porcion,
          ingrediente_id,
          ingredientes (
            id, nombre, unidad_base, categoria, observaciones
          )
        )
      `,
      )
      .eq("id", id)
      .single();

    if (error) return null;
    return data;
  },

  agregarReceta: async (receta) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from("recetas")
      .insert(receta)
      .select()
      .single();

    if (error) {
      set({ error: error.message, loading: false });
      return;
    }
    set((state) => ({
      recetas: [...state.recetas, data],
      loading: false,
    }));
  },
}));

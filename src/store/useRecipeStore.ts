import { create } from "zustand";
import { supabase } from "../lib/supabase";

export interface Ingrediente {
  id: string;
  nombre: string;
  unidad_base: string;
  categoria: string;
  observaciones?: string | null;
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
  descripcion?: string | null;
  es_publica?: boolean | null;
  es_vegano?: boolean | null;
  es_vegetariano?: boolean | null;
  es_picante?: boolean | null;
  contiene_nueces?: boolean | null;
  sin_gluten?: boolean | null;
  sin_lactosa?: boolean | null;
  categoria?: string | null;
  instrucciones?: string | null;
  foto_url?: string | null;
  tiempo_preparacion?: number | null;
  tiempo_coccion?: number | null;
  creditos?: string | null;
  utensilios?: string[] | null;
  palabras_clave?: string[] | null;
  receta_ingredientes?: RecetaIngrediente[];
  creado_por?: string | null;
  receta_origen_id?: string | null;
}

interface RecipeStore {
  recetas: Receta[];
  loading: boolean;
  error: string | null;
  fetchRecetas: () => Promise<void>;
  fetchRecetaById: (id: string) => Promise<Receta | null>;
  agregarReceta: (receta: Omit<Receta, "id" | "creado_por" | "receta_origen_id">) => Promise<string | null>;
  eliminarReceta: (id: string) => Promise<void>;
  ocultarReceta: (recetaId: string) => Promise<void>;
}

export const useRecipeStore = create<RecipeStore>((set) => ({
  recetas: [],
  loading: false,
  error: null,

  fetchRecetas: async () => {
    set({ loading: true, error: null });

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    // Get hidden recipe IDs for this user
    const { data: hiddenRows } = await supabase
      .from("recetas_ocultas_por_usuario")
      .select("receta_id");
    const hiddenIds = hiddenRows?.map((r) => r.receta_id) ?? [];

    // Fetch base recipes + own recipes, excluding hidden ones
    let query = supabase
      .from("recetas")
      .select("*")
      .or(`creado_por.is.null,creado_por.eq.${userId}`)
      .order("nombre");

    if (hiddenIds.length > 0) {
      query = query.not("id", "in", `(${hiddenIds.join(",")})`);
    }

    const { data, error } = await query;

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
        `*,
        receta_ingredientes (
          id,
          cantidad_por_porcion,
          ingrediente_id,
          ingredientes (
            id, nombre, unidad_base, categoria, observaciones
          )
        )`,
      )
      .eq("id", id)
      .single();

    if (error) return null;
    return data;
  },

  agregarReceta: async (receta) => {
    set({ loading: true, error: null });
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      set({ error: "No autenticado", loading: false });
      return null;
    }

    const { data, error } = await supabase
      .from("recetas")
      .insert({ ...receta, creado_por: userId })
      .select()
      .single();

    if (error) {
      set({ error: error.message, loading: false });
      return null;
    }
    set((state) => ({
      recetas: [...state.recetas, data],
      loading: false,
    }));
    return data.id;
  },

  eliminarReceta: async (id) => {
    await supabase.from("recetas").delete().eq("id", id);
    set((state) => ({
      recetas: state.recetas.filter((r) => r.id !== id),
    }));
  },

  ocultarReceta: async (recetaId) => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;
    await supabase
      .from("recetas_ocultas_por_usuario")
      .insert({ user_id: userId, receta_id: recetaId });
    set((state) => ({
      recetas: state.recetas.filter((r) => r.id !== recetaId),
    }));
  },
}));

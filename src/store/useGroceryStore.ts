import { create } from "zustand";

export interface GroceryItem {
  id: number;
  nombre: string;
  cantidad: number;
  unidad: string;
  categoria: string;
  observaciones?: string;
  comprado: boolean;
}

interface GroceryStore {
  items: GroceryItem[];
  setItems: (items: GroceryItem[]) => void;
  toggleComprado: (id: number) => void;
  resetComprados: () => void;
}

export const useGroceryStore = create<GroceryStore>((set) => ({
  items: [],

  setItems: (items) => set({ items }),

  toggleComprado: (id) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, comprado: !item.comprado } : item,
      ),
    })),

  resetComprados: () =>
    set((state) => ({
      items: state.items.map((item) => ({ ...item, comprado: false })),
    })),
}));

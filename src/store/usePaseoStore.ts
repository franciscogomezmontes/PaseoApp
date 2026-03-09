import { create } from "zustand";

export interface Participante {
  id: number;
  nombre: string;
  factor: number;
  diasAsistencia: number;
  puso: number;
  unidadFamiliar: number;
}

export interface Paseo {
  id: string;
  nombre: string;
  lugar: string;
  fechaInicio: string;
  fechaFin: string;
  participantes: Participante[];
}

interface PaseoStore {
  paseoActivo: Paseo | null;
  setPaseoActivo: (paseo: Paseo) => void;
  agregarParticipante: (p: Participante) => void;
  eliminarParticipante: (id: number) => void;
  actualizarPuso: (id: number, monto: number) => void;
}

export const usePaseoStore = create<PaseoStore>((set) => ({
  paseoActivo: null,

  setPaseoActivo: (paseo) => set({ paseoActivo: paseo }),

  agregarParticipante: (p) =>
    set((state) => ({
      paseoActivo: state.paseoActivo
        ? {
            ...state.paseoActivo,
            participantes: [...state.paseoActivo.participantes, p],
          }
        : null,
    })),

  eliminarParticipante: (id) =>
    set((state) => ({
      paseoActivo: state.paseoActivo
        ? {
            ...state.paseoActivo,
            participantes: state.paseoActivo.participantes.filter(
              (p) => p.id !== id,
            ),
          }
        : null,
    })),

  actualizarPuso: (id, monto) =>
    set((state) => ({
      paseoActivo: state.paseoActivo
        ? {
            ...state.paseoActivo,
            participantes: state.paseoActivo.participantes.map((p) =>
              p.id === id ? { ...p, puso: monto } : p,
            ),
          }
        : null,
    })),
}));

import { create } from "zustand";

export interface Gasto {
  id: number;
  descripcion: string;
  valor: number;
  pagadoPor: string;
  categoria: string;
  fecha: string;
}

export interface Transferencia {
  de: string;
  a: string;
  monto: number;
}

interface ExpensesStore {
  gastos: Gasto[];
  agregarGasto: (g: Gasto) => void;
  eliminarGasto: (id: number) => void;
  calcularLiquidacion: (
    participantes: {
      nombre: string;
      factor: number;
      diasAsistencia: number;
      puso: number;
    }[],
  ) => Transferencia[];
}

export const useExpensesStore = create<ExpensesStore>((set, get) => ({
  gastos: [],

  agregarGasto: (g) => set((state) => ({ gastos: [...state.gastos, g] })),

  eliminarGasto: (id) =>
    set((state) => ({ gastos: state.gastos.filter((g) => g.id !== id) })),

  calcularLiquidacion: (participantes) => {
    const { gastos } = get();
    const totalGastos = gastos.reduce((sum, g) => sum + g.valor, 0);
    const sumaFactores = participantes.reduce(
      (sum, p) => sum + p.factor * p.diasAsistencia,
      0,
    );

    if (sumaFactores === 0) return [];

    const tarifaDia = totalGastos / sumaFactores;

    // Calculate each person's balance
    const saldos = participantes.map((p) => ({
      nombre: p.nombre,
      saldo: p.puso - Math.round(tarifaDia * p.factor * p.diasAsistencia),
    }));

    // Minimum cash flow algorithm
    const transferencias: Transferencia[] = [];
    const deudores = saldos
      .filter((s) => s.saldo < 0)
      .map((s) => ({ ...s, restante: Math.abs(s.saldo) }));
    const acreedores = saldos
      .filter((s) => s.saldo > 0)
      .map((s) => ({ ...s, restante: s.saldo }));

    let di = 0;
    let ai = 0;

    while (di < deudores.length && ai < acreedores.length) {
      const monto = Math.min(deudores[di].restante, acreedores[ai].restante);
      if (monto > 100) {
        transferencias.push({
          de: deudores[di].nombre,
          a: acreedores[ai].nombre,
          monto,
        });
      }
      deudores[di].restante -= monto;
      acreedores[ai].restante -= monto;
      if (deudores[di].restante < 100) di++;
      if (acreedores[ai].restante < 100) ai++;
    }

    return transferencias;
  },
}));

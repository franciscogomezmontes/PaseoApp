export interface Balance {
  id: string;
  nombre: string;
  balance: number;
}

export interface Transferencia {
  de: string;
  para: string;
  deFamId: string;
  paraFamId: string;
  monto: number;
}

/**
 * Greedy minimum-cash-flow algorithm: converts a list of balances into the
 * smallest set of transfers that settles all debts.
 *
 * @param balances - Array of { id, nombre, balance } where balance > 0 means
 *                   the entity is owed money, balance < 0 means it owes money.
 * @param threshold - Transfers smaller than this value are ignored (default 1).
 */
export function calcularTransferenciasMinimas(
  balances: Balance[],
  threshold = 1,
): Transferencia[] {
  const deudores = balances
    .filter((b) => b.balance < -threshold)
    .map((b) => ({ id: b.id, nombre: b.nombre, monto: -b.balance }))
    .sort((a, b) => b.monto - a.monto);

  const acreedores = balances
    .filter((b) => b.balance > threshold)
    .map((b) => ({ id: b.id, nombre: b.nombre, monto: b.balance }))
    .sort((a, b) => b.monto - a.monto);

  const transferencias: Transferencia[] = [];
  let i = 0;
  let j = 0;

  while (i < deudores.length && j < acreedores.length) {
    const monto = Math.min(deudores[i].monto, acreedores[j].monto);
    if (monto > threshold) {
      transferencias.push({
        de: deudores[i].nombre,
        para: acreedores[j].nombre,
        deFamId: deudores[i].id,
        paraFamId: acreedores[j].id,
        monto,
      });
    }
    deudores[i].monto -= monto;
    acreedores[j].monto -= monto;
    if (deudores[i].monto < threshold) i++;
    if (acreedores[j].monto < threshold) j++;
  }

  return transferencias;
}

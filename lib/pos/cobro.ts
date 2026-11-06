export type MedioPago = 'efectivo_gs' | 'efectivo_brl' | 'transferencia' | 'tarjeta'

export function equivalenteBrl(totalGs: number, cotizacion: number): number {
  if (!Number.isFinite(totalGs) || !Number.isFinite(cotizacion) || cotizacion === 0) return totalGs / cotizacion
  const total = decimalesAEntero(totalGs, 2)
  const tasa = decimalesAEntero(cotizacion, 2)
  if (tasa === BigInt(0)) return totalGs / cotizacion
  return Number(redondearDivision(total * BigInt(100), tasa)) / 100
}

// Menor monto en centavos que cubre el total al convertirlo a guaraníes.
export function montoExactoBrl(totalGs: number, cotizacion: number): number {
  const total = decimalesAEntero(totalGs, 2)
  const tasa = decimalesAEntero(cotizacion, 2)
  const centavos = (total * BigInt(100) + tasa - BigInt(1)) / tasa
  return Number(centavos) / 100
}

export function previewCobro(
  totalGs: number,
  medio: MedioPago,
  recibido: number | null,
  cotizacion: number | null,
): { equivalenteGs: number | null; vueltoGs: number | null; alcanza: boolean } {
  if (medio === 'transferencia' || medio === 'tarjeta') {
    return { equivalenteGs: totalGs, vueltoGs: 0, alcanza: true }
  }
  if (recibido === null || !Number.isFinite(recibido) || recibido < 0 ||
      (medio === 'efectivo_brl' && (cotizacion === null || !Number.isFinite(cotizacion) || cotizacion <= 0))) {
    return { equivalenteGs: null, vueltoGs: null, alcanza: false }
  }
  const equivalenteGs = medio === 'efectivo_brl'
    ? Number(redondearDivision(decimalesAEntero(recibido, 2) * decimalesAEntero(cotizacion!, 2), BigInt(10000)))
    : recibido
  if (equivalenteGs < totalGs) return { equivalenteGs, vueltoGs: null, alcanza: false }
  const diferencia = decimalesAEntero(equivalenteGs, 2) - decimalesAEntero(totalGs, 2)
  return { equivalenteGs, vueltoGs: Number(redondearDivision(diferencia, BigInt(10000)) * BigInt(100)), alcanza: true }
}
import { decimalesAEntero, redondearDivision } from './redondeo'


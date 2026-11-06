export type MedioPago = 'efectivo_gs' | 'efectivo_brl' | 'transferencia' | 'tarjeta'

export function equivalenteBrl(totalGs: number, cotizacion: number): number {
  return Math.round((totalGs / cotizacion) * 100) / 100
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
  const equivalenteGs = medio === 'efectivo_brl' ? Math.round(recibido * cotizacion!) : recibido
  if (equivalenteGs < totalGs) return { equivalenteGs, vueltoGs: null, alcanza: false }
  return { equivalenteGs, vueltoGs: Math.round((equivalenteGs - totalGs) / 100) * 100, alcanza: true }
}

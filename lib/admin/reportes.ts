import type { Database } from '@/types/supabase'
import { codigoDeError, MENSAJES_ERROR } from '@/lib/errores'

type RpcVentas = Database['public']['Functions']['reporte_ventas']['Returns'][number]
type CampoNumerico = 'ventas' | 'total_gs' | 'recibido_brl' | 'equivalente_gs' | 'anuladas' | 'anuladas_gs'
export type FilaVentas = RpcVentas
type FilaVentasRpc = Omit<RpcVentas, CampoNumerico> & { [K in CampoNumerico]: number | string }

export function mapFilaVentas(fila: FilaVentasRpc): FilaVentas {
  return { ...fila, ventas: Number(fila.ventas), total_gs: Number(fila.total_gs), recibido_brl: Number(fila.recibido_brl), equivalente_gs: Number(fila.equivalente_gs), anuladas: Number(fila.anuladas), anuladas_gs: Number(fila.anuladas_gs) }
}
export function resumenVentas(filas: FilaVentas[]) {
  return filas.reduce((r, f) => {
    r.ventas += f.ventas; r.anuladas += f.anuladas; r.totalGs += f.total_gs
    if (f.medio === 'efectivo_gs') r.efectivoGs += f.total_gs
    if (f.medio === 'efectivo_brl') { r.efectivoBrl += f.recibido_brl; r.efectivoBrlEquivGs += f.equivalente_gs }
    if (f.medio === 'transferencia') r.transferenciasGs += f.total_gs
    if (f.medio === 'tarjeta') r.tarjetasGs += f.total_gs
    return r
  }, { ventas: 0, anuladas: 0, totalGs: 0, efectivoGs: 0, efectivoBrl: 0, efectivoBrlEquivGs: 0, transferenciasGs: 0, tarjetasGs: 0 })
}
export function ventasPorDia(filas: FilaVentas[]) {
  const fechas = [...new Set(filas.map(f => f.fecha))].sort((a, b) => b.localeCompare(a))
  return fechas.map(fecha => ({ fecha, resumen: resumenVentas(filas.filter(f => f.fecha === fecha)) }))
}
export function ventasPorEmpleado(filas: FilaVentas[]) {
  const empleados = new Map<string, { empleadoId: string; nombre: string; ventas: number; totalGs: number }>()
  for (const f of filas) {
    const e = empleados.get(f.empleado_id) ?? { empleadoId: f.empleado_id, nombre: f.empleado_nombre, ventas: 0, totalGs: 0 }
    e.ventas += f.ventas; e.totalGs += f.total_gs; empleados.set(f.empleado_id, e)
  }
  return [...empleados.values()].sort((a, b) => b.totalGs - a.totalGs)
}
export function mensajeErrorReporte(error: { message: string }) {
  const codigo = codigoDeError(error)
  return codigo ? MENSAJES_ERROR[codigo] : 'No se pudo completar. Probá de nuevo.'
}

import { describe, expect, it } from 'vitest'
import { mapFilaVentas, resumenVentas, ventasPorDia, ventasPorEmpleado } from '@/lib/admin/reportes'

const base = { fecha: '2026-11-01', empleado_id: 'e1', empleado_nombre: 'Ana', ventas: '1', total_gs: '31000', recibido_brl: '0', equivalente_gs: '31000', anuladas: '0', anuladas_gs: '0' }
const filas = [
  mapFilaVentas({ ...base, medio: 'efectivo_gs' }),
  mapFilaVentas({ ...base, medio: 'efectivo_brl', recibido_brl: '50', equivalente_gs: '72500' }),
  mapFilaVentas({ ...base, medio: 'tarjeta', ventas: '0', total_gs: '0', equivalente_gs: '0', anuladas: '1', anuladas_gs: '8000' }),
]

describe('reportes de ventas', () => {
  it('convierte los números de PostgREST y resume los medios', () => {
    expect(filas[1]).toMatchObject({ ventas: 1, total_gs: 31000, recibido_brl: 50, equivalente_gs: 72500, anuladas: 0, anuladas_gs: 0 })
    expect(resumenVentas(filas)).toEqual({ ventas: 2, anuladas: 1, totalGs: 62000, efectivoGs: 31000, efectivoBrl: 50, efectivoBrlEquivGs: 72500, transferenciasGs: 0, tarjetasGs: 0 })
  })
  it('agrupa medios por empleado y ordena por total', () => {
    const otra = mapFilaVentas({ ...base, empleado_id: 'e2', empleado_nombre: 'Luis', total_gs: '1000', medio: 'transferencia' })
    expect(ventasPorEmpleado([...filas, otra])).toEqual([{ empleadoId: 'e1', nombre: 'Ana', ventas: 2, totalGs: 62000 }, { empleadoId: 'e2', nombre: 'Luis', ventas: 1, totalGs: 1000 }])
  })
  it('agrupa por fecha descendente', () => {
    const otra = { ...filas[0], fecha: '2026-11-02' }
    expect(ventasPorDia([...filas, otra]).map(d => [d.fecha, d.resumen.totalGs])).toEqual([['2026-11-02', 31000], ['2026-11-01', 62000]])
  })
})

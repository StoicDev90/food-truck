import { randomUUID } from 'node:crypto'
import { beforeEach, describe, expect, it } from 'vitest'
import { admin, crearProducto, crearUsuario, limpiarOperaciones } from './helpers'

const nombres = ['reporte_ventas', 'reporte_mas_vendidos', 'reporte_cierres', 'reporte_anulaciones', 'reporte_movimientos_caja'] as const
const rango = { p_desde: '2026-11-01', p_hasta: '2026-11-01' }

describe('reportes del panel', () => {
  beforeEach(limpiarOperaciones)

  it('restringe todos los reportes y valida el rango', async () => {
    const d = await crearUsuario('dueno')
    const e = await crearUsuario('empleado')
    for (const nombre of nombres) {
      expect((await e.client.rpc(nombre, rango)).error?.message).toBe('NO_AUTORIZADO')
      expect((await d.client.rpc(nombre, { p_desde: '2026-11-02', p_hasta: '2026-11-01' })).error?.message).toBe('VALOR_INVALIDO')
      expect((await d.client.rpc(nombre, { p_desde: '2026-01-01', p_hasta: '2027-01-03' })).error?.message).toBe('VALOR_INVALIDO')
    }
  })

  it('agrupa por apertura del turno, medios, productos y cierres', async () => {
    const d = await crearUsuario('dueno')
    const e = await crearUsuario('empleado')
    const p = await crearProducto({ costoGs: 4400 })
    const sinCosto = await crearProducto()
    const primero = await admin.from('turnos').insert({ empleado_id: e.id, abierto_at: '2026-11-02T02:30:00Z', cerrado_at: '2026-11-02T04:00:00Z', cerrado_por: e.id, fondo_gs: 831000, contado_gs: 815000, contado_brl: 50 }).select().single()
    expect(primero.error).toBeNull()
    const turno = primero.data!.id
    async function venta(total: number, medio: 'efectivo_gs' | 'efectivo_brl' | 'tarjeta' | 'transferencia', anulada = false) {
      const v = await admin.from('ventas').insert({ turno_id: turno, empleado_id: e.id, total_gs: total, clave_idempotencia: randomUUID(), created_at: '2026-11-02T03:30:00Z', estado: anulada ? 'anulada' : 'confirmada', anulada_por: anulada ? d.id : null, anulada_at: anulada ? '2026-11-02T04:00:00Z' : null, anulada_motivo: anulada ? 'error' : null }).select().single()
      expect(v.error).toBeNull()
      const pago = await admin.from('pagos').insert({ venta_id: v.data!.id, medio, moneda: medio === 'efectivo_brl' ? 'BRL' : 'PYG', monto_recibido: medio === 'efectivo_brl' ? 50 : total, cotizacion: medio === 'efectivo_brl' ? 1450 : null, equivalente_gs: medio === 'efectivo_brl' ? 72500 : total, vuelto_gs: medio === 'efectivo_brl' ? 41500 : 0 })
      expect(pago.error).toBeNull()
      return v.data!.id
    }
    const v1 = await venta(31000, 'efectivo_gs')
    await venta(31000, 'efectivo_brl')
    await venta(8000, 'tarjeta', true)
    await venta(500, 'transferencia')
    expect((await admin.from('venta_items').insert([{ venta_id: v1, producto_id: p, cantidad: 3, precio_unitario_gs: 8000, costo_unitario_gs: 4400 }, { venta_id: v1, producto_id: sinCosto, cantidad: 1, precio_unitario_gs: 7000 }])).error).toBeNull()
    expect((await admin.from('correcciones_conteo').insert({ turno_id: turno, dueno_id: d.id, contado_gs_anterior: 814000, contado_gs_nuevo: 815000, motivo: 'recuento' })).error).toBeNull()
    const segundo = await admin.from('turnos').insert({ empleado_id: e.id, abierto_at: '2026-11-02T05:00:00Z', fondo_gs: 100 }).select().single()
    expect(segundo.error).toBeNull()
    expect((await admin.from('movimientos_caja').insert({ turno_id: turno, usuario_id: d.id, sentido: 'salida', tipo: 'otro', moneda: 'PYG', monto: 500, motivo: 'prueba', created_at: '2026-11-02T03:40:00Z' })).error).toBeNull()
    const ventas = await d.client.rpc('reporte_ventas', rango)
    expect(ventas.error).toBeNull()
    expect(ventas.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ medio: 'efectivo_gs', ventas: 1, total_gs: 31000 }),
      expect.objectContaining({ medio: 'efectivo_brl', ventas: 1, total_gs: 31000, recibido_brl: 50, equivalente_gs: 72500 }),
      expect.objectContaining({ medio: 'tarjeta', ventas: 0, total_gs: 0, anuladas: 1, anuladas_gs: 8000 }),
    ]))
    expect((await d.client.rpc('reporte_ventas', { p_desde: '2026-11-02', p_hasta: '2026-11-02' })).data).toEqual([])
    const mas = await d.client.rpc('reporte_mas_vendidos', rango)
    expect(mas.error).toBeNull()
    expect(mas.data).toEqual(expect.arrayContaining([expect.objectContaining({ producto_id: p, cantidad: 3, ganancia_gs: 10800 }), expect.objectContaining({ producto_id: sinCosto, ganancia_gs: null, unidades_sin_costo: 1 })]))
    const cierres = await d.client.rpc('reporte_cierres', rango)
    expect(cierres.error).toBeNull()
    expect(cierres.data).toEqual([expect.objectContaining({ turno_id: turno, corregido: true, esperado_gs: 820000, contado_gs: 815000, diferencia_gs: -5000 })])
    const cierresDiaSiguiente = await d.client.rpc('reporte_cierres', { p_desde: '2026-11-02', p_hasta: '2026-11-02' })
    expect(cierresDiaSiguiente.error).toBeNull()
    expect(cierresDiaSiguiente.data).toEqual([expect.objectContaining({ turno_id: segundo.data!.id, contado_anterior_gs: 815000, diferencia_gs: null })])
    const confirmadas = await admin.from('ventas').select('total_gs').eq('turno_id', turno).eq('estado', 'confirmada')
    expect(ventas.data!.reduce((s, v) => s + v.total_gs, 0)).toBe(confirmadas.data!.reduce((s, v) => s + v.total_gs, 0))
    expect(ventas.data!.filter(v => v.medio === 'transferencia' || v.medio === 'tarjeta').reduce((s, v) => s + v.total_gs, 0)).toBe(cierres.data!.reduce((s, c) => s + c.transferencias_gs + c.tarjetas_gs, 0))
    expect((await d.client.rpc('reporte_anulaciones', rango)).data).toEqual([expect.objectContaining({ motivo: 'error', total_gs: 8000 })])
    expect((await d.client.rpc('reporte_movimientos_caja', rango)).data).toEqual([expect.objectContaining({ motivo: 'prueba', turno_id: turno })])
  })
})

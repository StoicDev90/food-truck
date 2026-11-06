import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({ acceso: vi.fn(), rpc: vi.fn(), updateTag: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('next/cache', () => ({ updateTag: m.updateTag }))
vi.mock('@/lib/auth/sesion', () => ({ requerirAcceso: m.acceso }))
vi.mock('@/lib/supabase/server', () => ({ crearClienteServidor: async () => ({ rpc: m.rpc }) }))

import { abrirTurno, registrarVenta, ventasDelTurno, anularVenta, ingresarStock, registrarMovimientoCaja, cerrarTurno } from '@/lib/pos/acciones'
import { MENSAJES_ERROR } from '@/lib/errores'

const uuid = '123e4567-e89b-42d3-a456-426614174000'
const venta = { clave: uuid, items: [{ producto_id: uuid, cantidad: 2 }], medio: 'efectivo_gs' as const, montoRecibido: 5000 }
const movimiento = { sentido: 'salida' as const, tipo: 'retiro' as const, moneda: 'PYG' as const, monto: 100, motivo: 'retiro' }
const generico = { ok: false, codigo: null, error: 'No se pudo completar. Probá de nuevo.' }

beforeEach(() => {
  vi.resetAllMocks()
  m.acceso.mockResolvedValue({ id: uuid, rol: 'dueno', nombre: 'D', activo: true })
  m.rpc.mockResolvedValue({ data: null, error: null })
})

describe('acciones POS', () => {
  it.each([
    ['abrirTurno', () => abrirTurno(0, 0)],
    ['registrarVenta', () => registrarVenta(venta)],
    ['ventasDelTurno', () => ventasDelTurno()],
    ['anularVenta', () => anularVenta(uuid, 'error')],
    ['ingresarStock', () => ingresarStock(uuid, 1, null)],
    ['registrarMovimientoCaja', () => registrarMovimientoCaja(movimiento)],
    ['cerrarTurno', () => cerrarTurno(uuid, 0, 0)],
  ])('%s exige acceso antes de rpc', async (_nombre, accion) => {
    await accion()
    expect(m.acceso).toHaveBeenCalledWith('pos')
    expect(m.rpc).toHaveBeenCalled()
    expect(m.acceso.mock.invocationCallOrder[0]).toBeLessThan(m.rpc.mock.invocationCallOrder[0])
  })

  it('registra la venta y actualiza el menú', async () => {
    m.rpc.mockResolvedValue({ data: [{ venta_id: uuid, total_gs: '4000', vuelto_gs: '1000' }], error: null })
    expect(await registrarVenta(venta)).toEqual({ ok: true, data: { ventaId: uuid, totalGs: 4000, vueltoGs: 1000 } })
    expect(m.rpc).toHaveBeenCalledWith('registrar_venta', { p_clave: uuid, p_items: venta.items, p_medio: venta.medio, p_monto_recibido: 5000 })
    expect(m.updateTag).toHaveBeenCalledWith('menu')
  })

  it('traduce errores conocidos y desconocidos y captura fallos de red', async () => {
    m.rpc.mockResolvedValueOnce({ error: { message: 'STOCK_INSUFICIENTE' } }).mockResolvedValueOnce({ error: { message: 'otro' } }).mockRejectedValueOnce(new Error('red'))
    expect(await registrarVenta(venta)).toEqual({ ok: false, codigo: 'STOCK_INSUFICIENTE', error: MENSAJES_ERROR.STOCK_INSUFICIENTE })
    expect(await registrarVenta(venta)).toEqual(generico)
    expect(await registrarVenta(venta)).toEqual(generico)
    expect(m.updateTag).not.toHaveBeenCalled()
  })

  it('restringe movimientos al dueño y envía los argumentos', async () => {
    m.acceso.mockResolvedValueOnce({ rol: 'empleado' })
    expect(await registrarMovimientoCaja(movimiento)).toEqual({ ok: false, codigo: 'NO_AUTORIZADO', error: MENSAJES_ERROR.NO_AUTORIZADO })
    expect(m.rpc).not.toHaveBeenCalled()
    expect(await registrarMovimientoCaja(movimiento)).toEqual({ ok: true, data: null })
    expect(m.rpc).toHaveBeenCalledWith('registrar_movimiento_caja', { p_sentido: 'salida', p_tipo: 'retiro', p_moneda: 'PYG', p_monto: 100, p_motivo: 'retiro' })
  })

  it.each([{ ...venta, clave: 'x' }, { ...venta, items: [{ producto_id: uuid, cantidad: 0 }] }])('rechaza venta inválida antes de rpc', async input => {
    expect(await registrarVenta(input)).toEqual({ ok: false, codigo: 'VALOR_INVALIDO', error: MENSAJES_ERROR.VALOR_INVALIDO })
    expect(m.rpc).not.toHaveBeenCalled()
  })

  it('convierte el resumen de cierre a números', async () => {
    m.rpc.mockResolvedValue({ data: { esperado_gs: '100', esperado_brl: '2.5', contado_gs: '110', contado_brl: '3', diferencia_gs: '10', diferencia_brl: '0.5', transferencias_gs: '20', tarjetas_gs: '30' }, error: null })
    expect(await cerrarTurno(uuid, 110, 3)).toEqual({ ok: true, data: { esperadoGs: 100, esperadoBrl: 2.5, contadoGs: 110, contadoBrl: 3, diferenciaGs: 10, diferenciaBrl: 0.5, transferenciasGs: 20, tarjetasGs: 30 } })
  })

  it.each([['anulación', () => anularVenta(uuid, 'error')], ['ingreso', () => ingresarStock(uuid, 1, null)]])('%s actualiza el menú', async (_nombre, accion) => {
    await accion()
    expect(m.updateTag).toHaveBeenCalledWith('menu')
  })
})

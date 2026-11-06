import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({ acceso: vi.fn(), rpc: vi.fn(), from: vi.fn(), updateTag: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ updateTag: m.updateTag }))
vi.mock('@/lib/auth/sesion', () => ({ requerirAcceso: m.acceso }))
vi.mock('@/lib/supabase/server', () => ({ crearClienteServidor: async () => ({ rpc: m.rpc, from: m.from }) }))

import { abrirTurno, registrarVenta, ventasDelTurno, anularVenta, ingresarStock, registrarMovimientoCaja, cerrarTurno } from '@/lib/pos/acciones'
import { cargarPos } from '@/lib/pos/datos'
import { getRedirectError } from 'next/dist/client/components/redirect'
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
    m.rpc.mockResolvedValue({ data: { fondo_gs: '10', fondo_brl: '1', ventas_efectivo_gs: '80', ventas_efectivo_brl: '2', entradas_gs: '20', entradas_brl: '3', salidas_gs: '10', salidas_brl: '3.5', esperado_gs: '100', esperado_brl: '2.5', contado_gs: '110', contado_brl: '3', diferencia_gs: '10', diferencia_brl: '0.5', transferencias_gs: '20', tarjetas_gs: '30' }, error: null })
    expect(await cerrarTurno(uuid, 110, 3)).toEqual({ ok: true, data: { fondoGs: 10, fondoBrl: 1, ventasEfectivoGs: 80, ventasEfectivoBrl: 2, entradasGs: 20, entradasBrl: 3, salidasGs: 10, salidasBrl: 3.5, esperadoGs: 100, esperadoBrl: 2.5, contadoGs: 110, contadoBrl: 3, diferenciaGs: 10, diferenciaBrl: 0.5, transferenciasGs: 20, tarjetasGs: 30 } })
  })

  it.each([['anulación', () => anularVenta(uuid, 'error')], ['ingreso', () => ingresarStock(uuid, 1, null)]])('%s actualiza el menú', async (_nombre, accion) => {
    await accion()
    expect(m.updateTag).toHaveBeenCalledWith('menu')
  })
})


describe('errores de acceso y entradas malformadas', () => {
  const acciones = [
    () => abrirTurno(0, 0), () => registrarVenta(venta), () => ventasDelTurno(),
    () => anularVenta(uuid, 'error'), () => ingresarStock(uuid, 1, null),
    () => registrarMovimientoCaja(movimiento), () => cerrarTurno(uuid, 0, 0),
  ]
  it.each(acciones)('captura errores de acceso', async accion => {
    m.acceso.mockRejectedValue(new Error('red'))
    expect(await accion()).toEqual(generico)
    expect(m.rpc).not.toHaveBeenCalled()
  })
  it.each(acciones)('propaga redirect de acceso', async accion => {
    const error = getRedirectError('/login', 'replace')
    m.acceso.mockRejectedValue(error)
    await expect(accion()).rejects.toBe(error)
    expect(m.rpc).not.toHaveBeenCalled()
  })
  it.each([null, { ...venta, items: [null] }, { ...venta, items: 'x' },
    { ...venta, items: [{ producto_id: uuid, cantidad: NaN }] },
    { ...venta, items: [{ producto_id: uuid, cantidad: Infinity }] },
  ])('rechaza venta malformada', async input => {
    expect(await registrarVenta(input as typeof venta)).toEqual({ ok: false, codigo: 'VALOR_INVALIDO', error: MENSAJES_ERROR.VALOR_INVALIDO })
    expect(m.rpc).not.toHaveBeenCalled()
  })
  it('rechaza movimiento nulo y montos no finitos', async () => {
    for (const input of [null, { ...movimiento, monto: NaN }, { ...movimiento, monto: Infinity }]) {
      expect(await registrarMovimientoCaja(input as typeof movimiento)).toEqual({ ok: false, codigo: 'VALOR_INVALIDO', error: MENSAJES_ERROR.VALOR_INVALIDO })
    }
    expect(m.rpc).not.toHaveBeenCalled()
  })
})

describe('cargarPos', () => {
  it.each(['dueno', 'empleado'] as const)('carga perfil %s y convierte números', async rol => {
    const perfil = { id: uuid, rol, nombre: 'A', activo: true }
    m.acceso.mockResolvedValue(perfil)
    m.rpc.mockImplementation((nombre: string) => Promise.resolve({ data: nombre === 'turno_actual' ? [] : nombre === 'fondo_sugerido' ? [{ fondo_gs: '100', fondo_brl: '2.5' }] : null, error: null }))
    const selects: Record<string, string> = {}
    m.from.mockImplementation((tabla: string) => {
      const rows = tabla === 'categorias' ? [{ id: 'c', nombre: 'C', orden: 1 }] : [{ id: uuid, categoria_id: 'c', nombre: 'P', precio_gs: '50', stock: '3', controla_stock: true }]
      const builder = { select: (columnas: string) => { selects[tabla] = columnas; return builder }, eq: () => builder, order: () => builder, then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve) }
      return builder
    })
    expect(await cargarPos()).toEqual({ perfil, turno: null, categorias: [{ id: 'c', nombre: 'C' }], productos: [{ id: uuid, categoriaId: 'c', nombre: 'P', precioGs: 50, stock: 3, controlaStock: true }], cotizacion: null, fondoSugerido: { gs: 100, brl: 2.5 } })
    expect(selects.productos).toBe('id, categoria_id, nombre, precio_gs, stock, controla_stock')
    expect(selects.productos).not.toContain('*')
  })
})

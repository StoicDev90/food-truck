import { beforeEach, expect, it, vi } from 'vitest'
import { MENSAJES_ERROR } from '@/lib/errores'
const m = vi.hoisted(() => ({ acceso: vi.fn(), rpc: vi.fn(), tag: vi.fn() }))
vi.mock('@/lib/auth/sesion', () => ({ requerirAcceso: m.acceso }))
vi.mock('@/lib/supabase/server', () => ({ crearClienteServidor: async () => ({ rpc: m.rpc }) }))
vi.mock('next/cache', () => ({ updateTag: m.tag }))
import { ingresarStock, ajustarStock } from '@/lib/admin/stock'
const id = '123e4567-e89b-42d3-a456-426614174000'
beforeEach(() => { vi.resetAllMocks(); m.acceso.mockResolvedValue({}) })
it('rechaza ajuste cero sin consultar', async () => {
  expect(await ajustarStock(id, 0, 'conteo')).toMatchObject({ ok: false, codigo: 'CANTIDAD_INVALIDA' })
  expect(m.rpc).not.toHaveBeenCalled()
})
it('exige motivo para ajustar sin consultar', async () => {
  expect(await ajustarStock(id, -1, '  ')).toMatchObject({ ok: false, codigo: 'MOTIVO_REQUERIDO' })
  expect(m.rpc).not.toHaveBeenCalled()
})
it('rechaza ingreso fraccionario', async () => {
  expect(await ingresarStock(id, 1.5, '')).toMatchObject({ ok: false, codigo: 'VALOR_INVALIDO' })
  expect(m.rpc).not.toHaveBeenCalled()
})
it('traduce stock insuficiente', async () => {
  m.rpc.mockResolvedValue({ data: null, error: { message: 'STOCK_INSUFICIENTE' } })
  expect(await ajustarStock(id, -2, 'conteo')).toMatchObject({ ok: false, codigo: 'STOCK_INSUFICIENTE', error: MENSAJES_ERROR.STOCK_INSUFICIENTE })
})
it('invalida el menú tras cada movimiento exitoso', async () => {
  m.rpc.mockResolvedValue({ data: 4, error: null })
  expect(await ingresarStock(id, 2, '')).toEqual({ ok: true, data: { stock: 4 } })
  expect(await ajustarStock(id, -1, 'conteo')).toEqual({ ok: true, data: { stock: 4 } })
  expect(m.rpc).toHaveBeenCalledWith('registrar_ingreso_stock', { p_producto_id: id, p_cantidad: 2 })
  expect(m.rpc).toHaveBeenCalledWith('ajustar_stock', { p_producto_id: id, p_cantidad: -1, p_motivo: 'conteo' })
  expect(m.tag).toHaveBeenCalledTimes(2)
  expect(m.tag).toHaveBeenCalledWith('menu')
  expect(m.acceso).toHaveBeenCalledWith('admin')
})

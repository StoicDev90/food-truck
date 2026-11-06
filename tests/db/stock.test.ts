import { beforeEach, describe, expect, it } from 'vitest'
import { admin, crearProducto, crearUsuario, limpiarOperaciones } from './helpers'

describe('movimientos de stock', () => {
  beforeEach(async () => {
    await limpiarOperaciones()
  })

  it('ingreso, ajuste, permisos y errores', async () => {
    const p = await crearProducto({ stock: 10 })
    const e = await crearUsuario('empleado')
    const d = await crearUsuario('dueno')
    expect(
      (await e.client.rpc('registrar_ingreso_stock', { p_producto_id: p, p_cantidad: 15, p_motivo: 'preparé 15' })).data,
    ).toBe(25)
    const mov = (await admin.from('movimientos_stock').select().eq('producto_id', p)).data!
    expect(mov).toHaveLength(1)
    expect(mov[0]).toMatchObject({ tipo: 'ingreso', cantidad: 15, usuario_id: e.id, turno_id: null })
    expect((await e.client.rpc('registrar_ingreso_stock', { p_producto_id: p, p_cantidad: 0 })).error?.message).toBe('CANTIDAD_INVALIDA')
    expect((await e.client.rpc('ajustar_stock', { p_producto_id: p, p_cantidad: -3, p_motivo: 'merma' })).error?.message).toBe('NO_AUTORIZADO')
    expect((await d.client.rpc('ajustar_stock', { p_producto_id: p, p_cantidad: -3, p_motivo: 'merma' })).data).toBe(22)
    expect((await d.client.rpc('ajustar_stock', { p_producto_id: p, p_cantidad: -3, p_motivo: ' ' })).error?.message).toBe('MOTIVO_REQUERIDO')
    expect((await d.client.rpc('ajustar_stock', { p_producto_id: p, p_cantidad: 0, p_motivo: 'x' })).error?.message).toBe('CANTIDAD_INVALIDA')
    expect((await d.client.rpc('ajustar_stock', { p_producto_id: p, p_cantidad: -23, p_motivo: 'x' })).error?.message).toBe('STOCK_INSUFICIENTE')
    expect((await admin.from('productos').select('stock').eq('id', p).single()).data!.stock).toBe(22)
    expect((await d.client.rpc('registrar_ingreso_stock', { p_producto_id: crypto.randomUUID(), p_cantidad: 1 })).error?.message).toBe('VALOR_INVALIDO')
    const ex = await crearUsuario('empleado', { activo: false })
    expect((await ex.client.rpc('registrar_ingreso_stock', { p_producto_id: p, p_cantidad: 1 })).error?.message).toBe('NO_AUTORIZADO')
    expect((await e.client.rpc('_aplicar_mov_stock', {} as never)).error).not.toBeNull()
    expect(
      (await e.client.rpc('_aplicar_mov_stock', { p_producto_id: p, p_tipo: 'ajuste', p_cantidad: 1, p_motivo: 'x', p_venta_id: null } as never)).error,
    ).not.toBeNull()
  })

  it('registra el turno abierto', async () => {
    const p = await crearProducto({ stock: 0 })
    const e = await crearUsuario('empleado')
    const t = await admin.from('turnos').insert({ empleado_id: e.id }).select('id').single()
    expect(t.error).toBeNull()
    await e.client.rpc('registrar_ingreso_stock', { p_producto_id: p, p_cantidad: 2 })
    const m = (await admin.from('movimientos_stock').select().eq('producto_id', p)).data!
    expect(m[0].turno_id).toBe(t.data!.id)
  })
})

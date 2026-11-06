import { beforeEach, describe, expect, it } from 'vitest'
import { admin, anon, crearProducto, crearUsuario, limpiarOperaciones } from './helpers'

beforeEach(limpiarOperaciones)

const precioDe = async (id: string) =>
  (await admin.from('productos').select('precio_gs').eq('id', id).single()).data!.precio_gs

describe('rls', () => {
  it('anon ve solo productos visibles y sin costo', async () => {
    const visible = await crearProducto({ precioGs: 8000, costoGs: 5000 })
    const oculto = await crearProducto({ visible: false })
    const inactivo = await crearProducto({ activo: false })
    const { data } = await anon.from('productos').select('id, precio_gs')
    const ids = data!.map((r) => r.id)
    expect(ids).toContain(visible)
    expect(ids).not.toContain(oculto)
    expect(ids).not.toContain(inactivo)
    expect((await anon.from('productos').select('costo_gs')).error).not.toBeNull()
    expect((await anon.from('productos').select('stock')).error).toBeNull()
    expect((await anon.from('ventas').select()).error).not.toBeNull()
    expect((await anon.from('pagos').select()).error).not.toBeNull()
    expect((await anon.from('perfiles').select()).error).not.toBeNull()
    expect((await anon.from('cotizaciones').select()).error).not.toBeNull()
    expect((await anon.from('categorias').select()).error).toBeNull()
    expect((await anon.from('configuracion').select()).error).toBeNull()
    expect((await anon.from('productos').update({ precio_gs: 1 }).eq('id', visible)).error).not.toBeNull()
  })

  it('empleado no cambia precios ni ve operaciones', async () => {
    const visible = await crearProducto({ precioGs: 8000, costoGs: 5000 })
    const emp = await crearUsuario('empleado')
    await emp.client.from('productos').update({ precio_gs: 1 }).eq('id', visible)
    expect(await precioDe(visible)).toBe(8000)
    expect((await emp.client.from('productos').select('costo_gs')).error).not.toBeNull()
    expect((await emp.client.from('productos').select('id, precio_gs')).data!.length).toBeGreaterThan(0)
    for (const t of [
      'pagos', 'turnos', 'ventas', 'venta_items', 'movimientos_stock', 'movimientos_caja', 'correcciones_conteo',
    ] as const) {
      expect((await emp.client.from(t).select()).data).toEqual([])
    }
    expect((await emp.client.from('ventas').insert({} as never)).error).not.toBeNull()
    expect((await emp.client.from('productos').insert({} as never)).error).not.toBeNull()
    expect((await emp.client.from('categorias').insert({ nombre: 'x' })).error).not.toBeNull()
    await emp.client.from('configuracion').update({ nombre: 'hack' }).eq('id', 1)
    expect((await admin.from('configuracion').select('nombre').single()).data!.nombre).not.toBe('hack')
  })

  it('empleado ve su perfil, el dueño todos', async () => {
    const emp = await crearUsuario('empleado')
    const otro = await crearUsuario('empleado')
    const d = await crearUsuario('dueno')
    expect((await emp.client.from('perfiles').select()).data!.map((p) => p.id)).toEqual([emp.id])
    const ids = (await d.client.from('perfiles').select()).data!.map((p) => p.id)
    expect(ids).toEqual(expect.arrayContaining([emp.id, otro.id, d.id]))
    expect((await emp.client.from('perfiles').update({ rol: 'dueno' }).eq('id', emp.id)).error).not.toBeNull()
  })

  it('dueño cambia precio pero no stock', async () => {
    const p = await crearProducto({ precioGs: 8000 })
    const d = await crearUsuario('dueno')
    expect((await d.client.from('productos').update({ precio_gs: 9000 }).eq('id', p)).error).toBeNull()
    expect(await precioDe(p)).toBe(9000)
    expect((await d.client.from('productos').update({ stock: 99 }).eq('id', p)).error).not.toBeNull()
    const cat = (await d.client.from('categorias').insert({ nombre: 'Nueva' }).select('id').single())
    expect(cat.error).toBeNull()
    expect((await d.client.from('categorias').delete().eq('id', cat.data!.id)).error).toBeNull()
    expect((await d.client.from('configuracion').update({ nombre: 'Mi truck' }).eq('id', 1)).error).toBeNull()
    expect((await d.client.from('ventas').select()).error).toBeNull()
    expect((await d.client.from('ventas').insert({} as never)).error).not.toBeNull()
  })

  it('dueño desactivado no lee ni escribe', async () => {
    const p = await crearProducto({ precioGs: 9000 })
    const dx = await crearUsuario('dueno', { activo: false })
    await dx.client.from('productos').update({ precio_gs: 1 }).eq('id', p)
    expect(await precioDe(p)).toBe(9000)
    expect((await dx.client.from('productos').select('id')).data).toEqual([])
    expect((await dx.client.from('perfiles').select()).data).toEqual([])
    expect((await dx.client.from('categorias').insert({ nombre: 'z' })).error).not.toBeNull()
  })

  it('funciones auxiliares no son llamables por anon', async () => {
    expect((await anon.rpc('es_dueno')).error).not.toBeNull()
    const d = await crearUsuario('dueno')
    expect((await d.client.rpc('es_dueno')).data).toBe(true)
    expect((await d.client.rpc('rol_actual')).data).toBe('dueno')
  })
})

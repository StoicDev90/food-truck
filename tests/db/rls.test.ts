import { randomUUID } from 'node:crypto'
import { beforeEach, describe, expect, it } from 'vitest'
import { admin, anon, crearProducto, crearUsuario, limpiarOperaciones } from './helpers'

beforeEach(limpiarOperaciones)

const precioDe = async (id: string) =>
  (await admin.from('productos').select('precio_gs').eq('id', id).single()).data!.precio_gs

async function sembrar(empleadoId: string) {
  const t = await admin.from('turnos').insert({ empleado_id: empleadoId }).select('id').single()
  if (t.error) throw t.error
  const v = await admin
    .from('ventas')
    .insert({ turno_id: t.data.id, empleado_id: empleadoId, total_gs: 1000, clave_idempotencia: randomUUID() })
    .select('id')
    .single()
  if (v.error) throw v.error
  const p = await admin
    .from('pagos')
    .insert({ venta_id: v.data.id, medio: 'efectivo_gs', moneda: 'PYG', monto_recibido: 1000, equivalente_gs: 1000 })
  if (p.error) throw p.error
  return { turnoId: t.data.id, ventaId: v.data.id }
}

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
    const rc = await emp.client.rpc('costos_productos')
    expect(rc.error?.message).toContain('NO_AUTORIZADO')
    expect((await anon.rpc('costos_productos')).error).not.toBeNull()
    expect((await emp.client.from('productos').select('id, precio_gs')).data!.length).toBeGreaterThan(0)
    const { turnoId, ventaId } = await sembrar(emp.id)
    const d = await crearUsuario('dueno')
    for (const t of ['turnos', 'ventas', 'pagos'] as const) {
      expect((await admin.from(t).select()).data!.length).toBe(1)
      expect((await d.client.from(t).select()).data!.length).toBe(1)
      expect((await emp.client.from(t).select()).data).toEqual([])
    }
    for (const t of ['venta_items', 'movimientos_stock', 'movimientos_caja', 'correcciones_conteo'] as const) {
      expect((await emp.client.from(t).select()).error).toBeNull()
    }
    const { data: cat } = await admin.from('categorias').select('id').limit(1).single()
    const iv = await emp.client
      .from('ventas')
      .insert({ turno_id: turnoId, empleado_id: emp.id, total_gs: 1, clave_idempotencia: randomUUID() })
    expect(iv.error?.code).toBe('42501')
    const ip = await emp.client
      .from('productos')
      .insert({ categoria_id: cat!.id, nombre: 'hack-emp', precio_gs: 1 })
    expect(ip.error?.code).toBe('42501')
    const ic = await emp.client.from('categorias').insert({ nombre: 'hack-cat' })
    expect(ic.error?.code).toBe('42501')
    expect((await admin.from('ventas').select('id')).data!.map((r) => r.id)).toEqual([ventaId])
    expect((await admin.from('productos').select('id').eq('nombre', 'hack-emp')).data).toEqual([])
    expect((await admin.from('categorias').select('id').eq('nombre', 'hack-cat')).data).toEqual([])
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
    const cp = await crearProducto({ costoGs: 5000 })
    expect((await d.client.from('productos').select('costo_gs').eq('id', cp)).error).not.toBeNull()
    const costo = async () =>
      (await d.client.rpc('costos_productos')).data!.find((r) => r.producto_id === cp)
    expect(await costo()).toEqual({ producto_id: cp, costo_gs: 5000 })
    expect((await d.client.from('productos').update({ costo_gs: 6000 }).eq('id', cp)).error).toBeNull()
    expect((await costo())!.costo_gs).toBe(6000)
    expect((await d.client.from('productos').update({ precio_gs: 9000 }).eq('id', p)).error).toBeNull()
    expect(await precioDe(p)).toBe(9000)
    expect((await d.client.from('productos').update({ stock: 99 }).eq('id', p)).error).not.toBeNull()
    const cat = (await d.client.from('categorias').insert({ nombre: 'Nueva' }).select('id').single())
    expect(cat.error).toBeNull()
    expect((await d.client.from('categorias').delete().eq('id', cat.data!.id)).error).toBeNull()
    expect((await d.client.from('configuracion').update({ nombre: 'Mi truck' }).eq('id', 1)).error).toBeNull()
    expect((await d.client.from('ventas').select()).error).toBeNull()
    const { turnoId } = await sembrar(d.id)
    const iv = await d.client
      .from('ventas')
      .insert({ turno_id: turnoId, empleado_id: d.id, total_gs: 1, clave_idempotencia: randomUUID() })
    expect(iv.error?.code).toBe('42501')
    expect((await admin.from('ventas').select('id')).data).toHaveLength(1)
  })

  it('dueño desactivado no lee ni escribe', async () => {
    const p = await crearProducto({ precioGs: 9000 })
    const dx = await crearUsuario('dueno', { activo: false })
    await dx.client.from('productos').update({ precio_gs: 1 }).eq('id', p)
    expect(await precioDe(p)).toBe(9000)
    expect((await dx.client.from('productos').select('id')).data).toEqual([])
    expect((await dx.client.from('perfiles').select()).data).toEqual([])
    expect((await dx.client.from('categorias').insert({ nombre: 'z' })).error?.code).toBe('42501')
    expect((await admin.from('categorias').select('id').eq('nombre', 'z')).data).toEqual([])
  })

  it('funciones auxiliares no son llamables por anon', async () => {
    expect((await anon.rpc('es_dueno')).error).not.toBeNull()
    const d = await crearUsuario('dueno')
    expect((await d.client.rpc('es_dueno')).data).toBe(true)
    expect((await d.client.rpc('rol_actual')).data).toBe('dueno')
  })

  it('funciones futuras nacen cerradas (default privileges)', async () => {
    const emp = await crearUsuario('empleado')
    expect((await anon.rpc('_probe_default_acl')).error).not.toBeNull()
    expect((await emp.client.rpc('_probe_default_acl')).error).not.toBeNull()
    expect((await admin.rpc('_probe_default_acl')).data).toBe(1)
  })
})

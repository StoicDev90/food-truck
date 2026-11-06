import pg from 'pg'
import { beforeEach, describe, expect, it } from 'vitest'
import { admin, crearProducto, crearUsuario, limpiarOperaciones } from './helpers'

type Cliente = Awaited<ReturnType<typeof crearUsuario>>['client']
type Item = { producto_id: string; cantidad: number }
type Medio = 'efectivo_gs' | 'efectivo_brl' | 'transferencia' | 'tarjeta'

const vender = (c: Cliente, items: unknown, medio: Medio, monto?: number) =>
  c.rpc('registrar_venta', {
    p_clave: crypto.randomUUID(),
    p_items: items as Item[],
    p_medio: medio,
    p_monto_recibido: monto,
  })

const stock = async (id: string) =>
  (await admin.from('productos').select('stock').eq('id', id).single()).data!.stock

const cotizar = async (valor = 1450) => {
  const hoy = (await admin.rpc('fecha_py')).data!
  await admin.rpc('registrar_cotizacion_api', { p_fecha: hoy, p_valor: valor, p_fuente: 't' })
}

const espera = () => new Promise((r) => setTimeout(r, 500))

async function conPg<T>(fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const c = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL })
  await c.connect()
  try {
    return await fn(c)
  } finally {
    await c.end()
  }
}

describe('ventas', () => {
  beforeEach(async () => {
    await limpiarOperaciones()
  })

  it('venta, cobro, validaciones, idempotencia, concurrencia, permisos y anulación', async () => {
    const e1 = await crearUsuario('empleado')
    const e2 = await crearUsuario('empleado')
    const d = await crearUsuario('dueno')
    const emp = await crearProducto({ precioGs: 8000, costoGs: 3000, stock: 40 })
    const cer = await crearProducto({ precioGs: 15000, stock: 24 })
    expect((await vender(e1.client, [{ producto_id: emp, cantidad: 1 }], 'tarjeta')).error?.message).toBe('SIN_TURNO_ABIERTO')
    const turno = (await e1.client.rpc('abrir_turno', { p_fondo_gs: 100000, p_fondo_brl: 0 })).data!
    const pedido = [{ producto_id: emp, cantidad: 2 }, { producto_id: cer, cantidad: 1 }]

    // básico + snapshot de precio y costo
    const v1 = (await vender(e1.client, pedido, 'transferencia')).data![0]
    expect(v1).toMatchObject({ total_gs: 31000, vuelto_gs: 0, equivalente_gs: 31000 })
    expect(v1.cotizacion).toBeNull()
    expect(await stock(emp)).toBe(38)
    expect(await stock(cer)).toBe(23)
    await admin.from('productos').update({ precio_gs: 9000 }).eq('id', emp)
    const it1 = (await admin.from('venta_items').select('precio_unitario_gs, costo_unitario_gs').eq('venta_id', v1.venta_id).eq('producto_id', emp).single()).data!
    expect(it1).toEqual({ precio_unitario_gs: 8000, costo_unitario_gs: 3000 })
    await admin.from('productos').update({ precio_gs: 8000 }).eq('id', emp)

    // reales
    expect((await vender(e1.client, pedido, 'efectivo_brl', 50)).error?.message).toBe('SIN_COTIZACION')
    expect(await stock(emp)).toBe(38)
    await cotizar()
    const v2 = (await vender(e1.client, pedido, 'efectivo_brl', 50)).data![0]
    expect(v2).toMatchObject({ total_gs: 31000, equivalente_gs: 72500, vuelto_gs: 41500 })
    expect(Number(v2.cotizacion)).toBe(1450)
    expect((await admin.from('pagos').select('moneda, monto_recibido').eq('venta_id', v2.venta_id).single()).data).toMatchObject({ moneda: 'BRL' })
    expect((await vender(e1.client, pedido, 'efectivo_brl', 1.234)).error?.message).toBe('VALOR_INVALIDO')
    expect((await vender(e1.client, pedido, 'efectivo_brl', 5)).error?.message).toBe('MONTO_INSUFICIENTE')
    expect((await vender(e1.client, pedido, 'efectivo_brl')).error?.message).toBe('VALOR_INVALIDO')

    // efectivo ₲
    expect((await vender(e1.client, pedido, 'efectivo_gs', 30000)).error?.message).toBe('MONTO_INSUFICIENTE')
    expect((await vender(e1.client, pedido, 'efectivo_gs', 50000.5)).error?.message).toBe('VALOR_INVALIDO')
    expect((await vender(e1.client, pedido, 'efectivo_gs')).error?.message).toBe('VALOR_INVALIDO')
    expect((await vender(e1.client, pedido, 'efectivo_gs', 50000)).data![0].vuelto_gs).toBe(19000)

    // validaciones de pedido
    expect((await vender(e1.client, [], 'tarjeta')).error?.message).toBe('VENTA_VACIA')
    expect((await vender(e1.client, { producto_id: emp }, 'tarjeta')).error?.message).toBe('VALOR_INVALIDO')
    expect((await vender(e1.client, [{ producto_id: emp, cantidad: 0 }], 'tarjeta')).error?.message).toBe('CANTIDAD_INVALIDA')
    expect((await vender(e1.client, [{ producto_id: emp, cantidad: -1 }], 'tarjeta')).error?.message).toBe('CANTIDAD_INVALIDA')
    expect((await vender(e1.client, [{ producto_id: emp, cantidad: 1.5 }], 'tarjeta')).error?.message).toBe('CANTIDAD_INVALIDA')
    expect((await vender(e1.client, [{ producto_id: emp, cantidad: '2' }], 'tarjeta')).error?.message).toBe('CANTIDAD_INVALIDA')
    expect((await vender(e1.client, [{ cantidad: 1 }], 'tarjeta')).error?.message).toBe('VALOR_INVALIDO')
    expect((await vender(e1.client, [{ producto_id: 'no-uuid', cantidad: 1 }], 'tarjeta')).error?.message).toBe('VALOR_INVALIDO')
    expect((await vender(e1.client, [{ producto_id: crypto.randomUUID(), cantidad: 1 }], 'tarjeta')).error?.message).toBe('VALOR_INVALIDO')
    // producto repetido: cantidades sumadas para el chequeo
    const ultimo = await crearProducto({ stock: 1 })
    expect((await vender(e1.client, [{ producto_id: ultimo, cantidad: 1 }, { producto_id: ultimo, cantidad: 1 }], 'tarjeta')).error?.message).toBe('STOCK_INSUFICIENTE')
    expect(await stock(ultimo)).toBe(1)
    const rep = (await vender(e1.client, [{ producto_id: emp, cantidad: 1 }, { producto_id: emp, cantidad: 2 }], 'tarjeta')).data![0]
    expect(rep.total_gs).toBe(24000)
    expect(await stock(emp)).toBe(38 - 2 - 2 - 3) // v2, efectivo_gs, repetido
    expect((await admin.from('ventas').select().eq('turno_id', turno)).data).toHaveLength(4) // v1, v2, efectivo, rep: nada parcial
    const libre = await crearProducto({ stock: 0, controlaStock: false })
    expect((await vender(e1.client, [{ producto_id: libre, cantidad: 3 }], 'tarjeta')).error).toBeNull()
    expect(await stock(libre)).toBe(0)
    expect((await admin.from('movimientos_stock').select().eq('producto_id', libre)).data).toHaveLength(0)
    const inactivo = await crearProducto({ activo: false })
    expect((await vender(e1.client, [{ producto_id: inactivo, cantidad: 1 }], 'tarjeta')).error?.message).toBe('PRODUCTO_INACTIVO')

    // idempotencia (Review Focus 2)
    const antes = await stock(emp)
    const clave = crypto.randomUUID()
    const args = { p_clave: clave, p_items: [{ producto_id: emp, cantidad: 1 }], p_medio: 'tarjeta' as const }
    const a = await e1.client.rpc('registrar_venta', args)
    const b = await e1.client.rpc('registrar_venta', args)
    expect(b.data![0].venta_id).toBe(a.data![0].venta_id)
    expect(await stock(emp)).toBe(antes - 1)
    expect((await admin.from('ventas').select().eq('clave_idempotencia', clave)).data).toHaveLength(1)

    // concurrencia por la última unidad (Review Focus 1)
    for (let i = 0; i < 3; i++) {
      const uno = await crearProducto({ stock: 1 })
      const res = await Promise.all([
        Promise.resolve(vender(e1.client, [{ producto_id: uno, cantidad: 1 }], 'tarjeta')),
        Promise.resolve(vender(d.client, [{ producto_id: uno, cantidad: 1 }], 'tarjeta')),
      ])
      expect(res.filter((r) => r.error === null)).toHaveLength(1)
      expect(res.find((r) => r.error)!.error!.message).toBe('STOCK_INSUFICIENTE')
      expect(await stock(uno)).toBe(0)
    }

    // permisos
    expect((await vender(e2.client, pedido, 'tarjeta')).error?.message).toBe('NO_AUTORIZADO')
    const inact = await crearUsuario('empleado', { activo: false })
    expect((await vender(inact.client, pedido, 'tarjeta')).error?.message).toBe('NO_AUTORIZADO')
    const vd = (await vender(d.client, [{ producto_id: emp, cantidad: 1 }], 'tarjeta')).data![0]
    expect((await admin.from('ventas').select('empleado_id').eq('id', vd.venta_id).single()).data!.empleado_id).toBe(d.id)

    // anulación
    expect((await e1.client.rpc('anular_venta', { p_venta_id: v1.venta_id, p_motivo: '' })).error?.message).toBe('MOTIVO_REQUERIDO')
    expect((await e2.client.rpc('anular_venta', { p_venta_id: v1.venta_id, p_motivo: 'x' })).error?.message).toBe('NO_AUTORIZADO')
    const cerAntes = await stock(cer)
    expect((await e1.client.rpc('anular_venta', { p_venta_id: v1.venta_id, p_motivo: 'error de carga' })).error).toBeNull()
    expect(await stock(cer)).toBe(cerAntes + 1)
    const an = (await admin.from('ventas').select('estado, anulada_por, anulada_at, anulada_motivo').eq('id', v1.venta_id).single()).data!
    expect(an).toMatchObject({ estado: 'anulada', anulada_por: e1.id, anulada_motivo: 'error de carga' })
    expect(an.anulada_at).not.toBeNull()
    expect((await admin.from('movimientos_stock').select('cantidad').eq('venta_id', v1.venta_id).eq('tipo', 'anulacion')).data).toHaveLength(2)
    expect((await e1.client.rpc('anular_venta', { p_venta_id: v1.venta_id, p_motivo: 'x' })).error?.message).toBe('VENTA_NO_ANULABLE')
    expect((await e1.client.rpc('anular_venta', { p_venta_id: crypto.randomUUID(), p_motivo: 'x' })).error?.message).toBe('VENTA_NO_ANULABLE')
    // dueño puede anular venta ajena; venta de libre (sin stock) no mueve stock
    expect((await d.client.rpc('anular_venta', { p_venta_id: vd.venta_id, p_motivo: 'dueño' })).error).toBeNull()

    // ventas_del_turno: solo total y medio, cualquier usuario activo
    const lista = (await e2.client.rpc('ventas_del_turno')).data!
    expect(lista.find((v) => v.id === v1.venta_id)!.estado).toBe('anulada')
    expect(Object.keys(lista[0]).sort()).toEqual(['created_at', 'empleado_nombre', 'estado', 'id', 'medio', 'total_gs'])
    const orden = lista.map((v) => v.created_at)
    expect(orden).toEqual([...orden].sort().reverse())
    expect((await inact.client.rpc('ventas_del_turno')).error?.message).toBe('NO_AUTORIZADO')
    // empleados siguen sin leer tablas
    expect((await e1.client.from('pagos').select()).data).toEqual([])
  })

  it('cierre con ventas: esperado de caja, anulada no cuenta, no se anula tras el cierre', async () => {
    const e1 = await crearUsuario('empleado')
    const emp = await crearProducto({ precioGs: 8000, stock: 40 })
    const cer = await crearProducto({ precioGs: 15000, stock: 24 })
    await cotizar()
    const turno = (await e1.client.rpc('abrir_turno', { p_fondo_gs: 100000, p_fondo_brl: 0 })).data!
    const pedido = [{ producto_id: emp, cantidad: 2 }, { producto_id: cer, cantidad: 1 }]
    await vender(e1.client, pedido, 'efectivo_gs', 50000)
    await vender(e1.client, pedido, 'efectivo_brl', 50)
    await vender(e1.client, pedido, 'transferencia')
    const una = (await vender(e1.client, pedido, 'tarjeta')).data![0].venta_id
    const anulada = (await vender(e1.client, pedido, 'efectivo_gs', 50000)).data![0].venta_id
    expect((await e1.client.rpc('anular_venta', { p_venta_id: anulada, p_motivo: 'error' })).error).toBeNull()
    await e1.client.rpc('registrar_movimiento_caja', { p_sentido: 'salida', p_tipo: 'retiro', p_moneda: 'PYG', p_monto: 20000, p_motivo: 'retiro' })
    const r = (await e1.client.rpc('cerrar_turno', { p_turno_id: turno, p_contado_gs: 69500, p_contado_brl: 50 })).data!
    expect(r).toMatchObject({ esperado_gs: 69500, diferencia_gs: 0, transferencias_gs: 31000, tarjetas_gs: 31000 })
    expect(Number(r.esperado_brl)).toBe(50)
    expect(Number(r.diferencia_brl)).toBe(0)
    expect((await e1.client.rpc('anular_venta', { p_venta_id: una, p_motivo: 'x' })).error?.message).toBe('VENTA_NO_ANULABLE')
    expect((await vender(e1.client, pedido, 'tarjeta')).error?.message).toBe('SIN_TURNO_ABIERTO')
    expect((await e1.client.rpc('ventas_del_turno')).data).toEqual([])
  })

  it('venta concurrente a un cierre no se adjunta al turno cerrado', async () => {
    const e1 = await crearUsuario('empleado')
    const p = await crearProducto({ stock: 5 })
    const t = (await e1.client.rpc('abrir_turno', { p_fondo_gs: 0, p_fondo_brl: 0 })).data!
    await conPg(async (c) => {
      await c.query('BEGIN')
      await c.query('SELECT id FROM public.turnos WHERE id = $1 FOR UPDATE', [t])
      await c.query(
        'UPDATE public.turnos SET cerrado_at = now(), contado_gs = 0, contado_brl = 0, cerrado_por = $2 WHERE id = $1',
        [t, e1.id],
      )
      const venta = Promise.resolve(vender(e1.client, [{ producto_id: p, cantidad: 1 }], 'tarjeta'))
      await espera()
      await c.query('COMMIT')
      expect((await venta).error?.message).toBe('SIN_TURNO_ABIERTO')
    })
    expect((await admin.from('ventas').select().eq('turno_id', t)).data).toHaveLength(0)
    expect(await stock(p)).toBe(5)
  })

  it('dos anulaciones concurrentes: una sola pasa', async () => {
    const e1 = await crearUsuario('empleado')
    const p = await crearProducto({ stock: 5 })
    await e1.client.rpc('abrir_turno', { p_fondo_gs: 0, p_fondo_brl: 0 })
    const v = (await vender(e1.client, [{ producto_id: p, cantidad: 2 }], 'tarjeta')).data![0].venta_id
    await conPg(async (c) => {
      await c.query('BEGIN')
      await c.query('SELECT id FROM public.ventas WHERE id = $1 FOR UPDATE', [v])
      await c.query(
        "UPDATE public.ventas SET estado = 'anulada', anulada_por = $2, anulada_at = now(), anulada_motivo = 'otra' WHERE id = $1",
        [v, e1.id],
      )
      const an = Promise.resolve(e1.client.rpc('anular_venta', { p_venta_id: v, p_motivo: 'carrera' }))
      await espera()
      await c.query('COMMIT')
      expect((await an).error?.message).toBe('VENTA_NO_ANULABLE')
    })
    expect(await stock(p)).toBe(3) // pg no devolvió stock; la función perdedora tampoco
    // y dos reales a la vez
    const v2 = (await vender(e1.client, [{ producto_id: p, cantidad: 1 }], 'tarjeta')).data![0].venta_id
    const res = await Promise.all(
      [1, 2].map(() => Promise.resolve(e1.client.rpc('anular_venta', { p_venta_id: v2, p_motivo: 'x' }))),
    )
    expect(res.filter((r) => r.error === null)).toHaveLength(1)
    expect(res.find((r) => r.error)!.error!.message).toBe('VENTA_NO_ANULABLE')
    expect(await stock(p)).toBe(3)
  })

  it('misma clave concurrente: la perdedora devuelve la venta existente', async () => {
    const e1 = await crearUsuario('empleado')
    const p = await crearProducto({ stock: 5, precioGs: 10000 })
    const t = (await e1.client.rpc('abrir_turno', { p_fondo_gs: 0, p_fondo_brl: 0 })).data!
    const clave = crypto.randomUUID()
    await conPg(async (c) => {
      await c.query('BEGIN')
      const { rows } = await c.query(
        "INSERT INTO public.ventas (turno_id, empleado_id, total_gs, clave_idempotencia) VALUES ($1, $2, 10000, $3) RETURNING id",
        [t, e1.id, clave],
      )
      await c.query(
        "INSERT INTO public.pagos (venta_id, medio, moneda, monto_recibido, equivalente_gs) VALUES ($1, 'tarjeta', 'PYG', 10000, 10000)",
        [rows[0].id],
      )
      const perdedora = Promise.resolve(
        e1.client.rpc('registrar_venta', { p_clave: clave, p_items: [{ producto_id: p, cantidad: 1 }], p_medio: 'tarjeta' }),
      )
      await espera()
      await c.query('COMMIT')
      const r = await perdedora
      expect(r.error).toBeNull()
      expect(r.data![0].venta_id).toBe(rows[0].id)
    })
    expect(await stock(p)).toBe(5)
    expect((await admin.from('ventas').select().eq('clave_idempotencia', clave)).data).toHaveLength(1)
  })
})

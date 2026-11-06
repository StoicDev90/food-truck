import 'server-only'
import { requerirAcceso } from '@/lib/auth/sesion'
import type { Perfil } from '@/lib/auth/acceso'
import { crearClienteServidor } from '@/lib/supabase/server'
import type { ProductoPos } from './pedido'

export type DatosPos = {
  perfil: Perfil
  turno: { id: string; empleadoId: string; empleadoNombre: string; abiertoAt: string } | null
  categorias: { id: string; nombre: string }[]
  productos: ProductoPos[]
  cotizacion: number | null
  fondoSugerido: { gs: number; brl: number }
}

export async function cargarPos(): Promise<DatosPos> {
  const perfil = await requerirAcceso('pos')
  const db = await crearClienteServidor()
  const [turno, fondo, cotizacion, categorias, productos] = await Promise.all([
    db.rpc('turno_actual'), db.rpc('fondo_sugerido'), db.rpc('cotizacion_vigente'),
    db.from('categorias').select('id, nombre, orden').order('orden').order('nombre'),
    db.from('productos').select('id, categoria_id, nombre, precio_gs, stock, controla_stock').eq('activo', true).order('nombre'),
  ])
  for (const resultado of [turno, fondo, cotizacion, categorias, productos]) {
    if (resultado.error) throw resultado.error
  }
  const t = turno.data?.[0]
  const f = fondo.data?.[0]
  const cats = categorias.data ?? []
  const orden = new Map(cats.map((c, i) => [c.id, i]))
  const prods = (productos.data ?? []).map(p => ({ id: p.id, categoriaId: p.categoria_id, nombre: p.nombre, precioGs: Number(p.precio_gs), stock: Number(p.stock), controlaStock: p.controla_stock }))
  prods.sort((a, b) => (orden.get(a.categoriaId) ?? Infinity) - (orden.get(b.categoriaId) ?? Infinity) || a.nombre.localeCompare(b.nombre))
  return { perfil, turno: t ? { id: t.id, empleadoId: t.empleado_id, empleadoNombre: t.empleado_nombre, abiertoAt: t.abierto_at } : null, categorias: cats.map(c => ({ id: c.id, nombre: c.nombre })), productos: prods, cotizacion: cotizacion.data == null ? null : Number(cotizacion.data), fondoSugerido: { gs: Number(f?.fondo_gs ?? 0), brl: Number(f?.fondo_brl ?? 0) } }
}

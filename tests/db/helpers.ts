import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { emailDeUsuario } from '@/lib/auth/empleado'

const opts = { auth: { persistSession: false, autoRefreshToken: false } }
const url = () => process.env.SUPABASE_URL!

export const admin: SupabaseClient<Database> = createClient<Database>(
  url(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  opts,
)
export const anon: SupabaseClient<Database> = createClient<Database>(
  url(),
  process.env.SUPABASE_ANON_KEY!,
  opts,
)

const sufijo = () => randomUUID().replace(/-/g, '').slice(0, 10)

export async function crearUsuario(
  rol: 'dueno' | 'empleado',
  o: { activo?: boolean } = {},
): Promise<{ id: string; usuario: string; client: SupabaseClient<Database> }> {
  const usuario = `u_${sufijo()}`
  const email = rol === 'empleado' ? emailDeUsuario(usuario) : `${usuario}@test.local`
  const password = rol === 'empleado' ? '123456' : 'secreto-123'
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw error
  const id = data.user.id
  const { error: e2 } = await admin.from('perfiles').insert({
    id,
    nombre: `Test ${usuario}`,
    usuario: rol === 'empleado' ? usuario : null,
    rol,
    activo: o.activo ?? true,
  })
  if (e2) throw e2
  const client = createClient<Database>(url(), process.env.SUPABASE_ANON_KEY!, opts)
  const { error: e3 } = await client.auth.signInWithPassword({ email, password })
  if (e3) throw e3
  return { id, usuario, client }
}

export async function crearProducto(
  o: {
    precioGs?: number
    costoGs?: number | null
    stock?: number
    controlaStock?: boolean
    activo?: boolean
    visible?: boolean
  } = {},
): Promise<string> {
  let { data: cat } = await admin.from('categorias').select('id').limit(1).maybeSingle()
  if (!cat) {
    const r = await admin.from('categorias').insert({ nombre: 'Test', orden: 0 }).select('id').single()
    if (r.error) throw r.error
    cat = r.data
  }
  const { data, error } = await admin
    .from('productos')
    .insert({
      categoria_id: cat.id,
      nombre: `Producto ${sufijo()}`,
      precio_gs: o.precioGs ?? 10000,
      costo_gs: o.costoGs ?? null,
      controla_stock: o.controlaStock ?? true,
      activo: o.activo ?? true,
      visible: o.visible ?? true,
    })
    .select('id')
    .single()
  if (error) throw error
  // fixture: el stock lo fija admin; en producción solo lo tocan las funciones
  const { error: e2 } = await admin
    .from('productos')
    .update({ stock: o.stock ?? 0 })
    .eq('id', data.id)
  if (e2) throw e2
  return data.id
}

const NIL = '00000000-0000-0000-0000-000000000000'

export async function limpiarOperaciones(): Promise<void> {
  for (const t of [
    'correcciones_conteo',
    'movimientos_caja',
    'pagos',
    'venta_items',
    'movimientos_stock',
    'ventas',
    'turnos',
  ] as const) {
    const { error } = await admin.from(t).delete().neq('id', NIL)
    if (error) throw error
  }
  const { error } = await admin.from('cotizaciones').delete().gte('fecha', '1900-01-01')
  if (error) throw error
}

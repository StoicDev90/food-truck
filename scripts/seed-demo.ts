import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { emailDeUsuario } from '../lib/auth/empleado'
import { derivarPasswordEmpleado } from '../lib/auth/pin-derivacion'
import type { Horarios } from '../lib/admin/horarios'
import type { Database } from '../types/supabase'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const pepper = process.env.EMPLEADO_PIN_PEPPER
const password = 'OasisDemo2026!'
const mensajeBase = 'La base ya tiene datos. Para empezar de cero: npx supabase db reset (borra la base local) y volvé a correr npm run db:demo.'

async function main() {
  let host: string
  try { host = new URL(url ?? '').hostname } catch { throw new Error('NEXT_PUBLIC_SUPABASE_URL no es una URL válida') }
  if (host !== '127.0.0.1' && host !== 'localhost') throw new Error('Solo se permite cargar datos en Supabase local')
  if (!url || !anonKey || !serviceKey) throw new Error('Faltan variables de Supabase en .env.local')
  // Validar el pepper antes de realizar cualquier escritura.
  const juanPassword = derivarPasswordEmpleado('juan', '123456', pepper)
  const anaPassword = derivarPasswordEmpleado('ana', '654321', pepper)
  const options = { auth: { persistSession: false, autoRefreshToken: false } }
  const admin = createClient<Database>(url, serviceKey, options)
  for (const tabla of ['categorias', 'perfiles'] as const) {
    const { count, error } = await admin.from(tabla).select('id', { count: 'exact', head: true })
    if (error) throw error
    if (count === null) throw new Error(`No se pudo contar ${tabla}`)
    if (count > 0) throw new Error(mensajeBase)
  }

  for (const usuario of [
    { email: 'dueno@oasis.local', password, nombre: 'Dueña Demo', rol: 'dueno' as const, usuario: null },
    { email: emailDeUsuario('juan'), password: juanPassword, nombre: 'Juan', rol: 'empleado' as const, usuario: 'juan' },
    { email: emailDeUsuario('ana'), password: anaPassword, nombre: 'Ana', rol: 'empleado' as const, usuario: 'ana' },
  ]) {
    const { data, error } = await admin.auth.admin.createUser({ email: usuario.email, password: usuario.password, email_confirm: true })
    if (error) throw error
    const { error: perfilError } = await admin.from('perfiles').insert({ id: data.user.id, nombre: usuario.nombre, rol: usuario.rol, usuario: usuario.usuario })
    if (perfilError) throw perfilError
  }

  const owner = createClient<Database>(url, anonKey, options)
  const { error: loginError } = await owner.auth.signInWithPassword({ email: 'dueno@oasis.local', password })
  if (loginError) throw loginError
  const { data: categorias, error: categoriasError } = await owner.from('categorias').insert([
    { nombre: 'Comidas', orden: 1 }, { nombre: 'Bebidas sin alcohol', orden: 2 }, { nombre: 'Bebidas con alcohol', orden: 3 },
  ]).select('id, nombre')
  if (categoriasError) throw categoriasError
  const categoria = (nombre: string) => {
    const id = categorias.find((c) => c.nombre === nombre)?.id
    if (!id) throw new Error(`Falta la categoría ${nombre}`)
    return id
  }
  const comidas = categoria('Comidas'), sinAlcohol = categoria('Bebidas sin alcohol'), alcohol = categoria('Bebidas con alcohol')
  const productos: (Database['public']['Tables']['productos']['Insert'] & { inicial?: number })[] = [
    { nombre: 'Empanada de carne', descripcion: 'Empanada rellena de carne.', precio_gs: 8000, costo_gs: 4400, categoria_id: comidas, inicial: 40 },
    { nombre: 'Empanada de pollo', descripcion: 'Empanada rellena de pollo.', precio_gs: 8000, costo_gs: 4000, categoria_id: comidas, inicial: 30 },
    { nombre: 'Empanada de choclo', descripcion: 'Empanada cremosa de choclo.', precio_gs: 8000, categoria_id: comidas, inicial: 3 },
    { nombre: 'Coxinha', descripcion: 'Coxinha dorada de pollo.', precio_gs: 7000, costo_gs: 3500, categoria_id: comidas, inicial: 0 },
    { nombre: 'Sándwich de carne asada', descripcion: 'Carne asada en pan fresco.', precio_gs: 25000, costo_gs: 14000, categoria_id: comidas, controla_stock: false },
    { nombre: 'Sándwich de pollo', descripcion: 'Pollo en pan fresco.', precio_gs: 22000, categoria_id: comidas, controla_stock: false },
    { nombre: 'Agua mineral 500 ml', descripcion: 'Agua mineral sin gas.', precio_gs: 5000, costo_gs: 2500, categoria_id: sinAlcohol, inicial: 48 },
    { nombre: 'Gaseosa 500 ml', descripcion: 'Gaseosa fría de 500 ml.', precio_gs: 7000, costo_gs: 3800, categoria_id: sinAlcohol, inicial: 36 },
    { nombre: 'Jugo natural', descripcion: 'Jugo de frutas natural.', precio_gs: 10000, categoria_id: sinAlcohol, inicial: 12 },
    { nombre: 'Cerveza Pilsen', descripcion: 'Cerveza Pilsen bien fría.', precio_gs: 15000, costo_gs: 9000, categoria_id: alcohol, inicial: 48 },
    { nombre: 'Cerveza Munich', descripcion: 'Cerveza Munich bien fría.', precio_gs: 15000, costo_gs: 9500, categoria_id: alcohol, inicial: 24 },
    { nombre: 'Fernet con cola', descripcion: 'Fernet servido con cola.', precio_gs: 25000, categoria_id: alcohol, controla_stock: false },
    { nombre: 'Promo de prueba', descripcion: 'Promoción de ejemplo oculta.', precio_gs: 1000, categoria_id: comidas, visible: false },
  ]
  const ids = new Map<string, string>()
  for (const { inicial, ...producto } of productos) {
    const { data, error } = await owner.from('productos').insert(producto).select('id').single()
    if (error) throw error
    ids.set(producto.nombre, data.id)
    if (inicial) {
      const { error: stockError } = await owner.rpc('registrar_ingreso_stock', { p_producto_id: data.id, p_cantidad: inicial, p_motivo: 'Stock inicial demo' })
      if (stockError) throw stockError
    }
  }
  const horarios: Horarios = {
    lun: null, mar: { abre: '17:00', cierra: '23:00' }, mie: { abre: '17:00', cierra: '23:00' }, jue: { abre: '17:00', cierra: '23:00' },
    vie: { abre: '17:00', cierra: '02:00' }, sab: { abre: '17:00', cierra: '02:00' }, dom: { abre: '16:00', cierra: '22:00' },
  }
  const { error: configError } = await owner.from('configuracion').update({ nombre: 'Oasis Itaipu', whatsapp: '595981000000', instagram: 'oasis_itaipu', ubicacion: 'https://maps.google.com/?q=Parque+Tacuru+Pucu+Hernandarias', horarios }).eq('id', 1)
  if (configError) throw configError
  const { error: cotizacionError } = await owner.rpc('fijar_cotizacion_manual', { p_valor: 1450 })
  if (cotizacionError) throw cotizacionError

  const empleado = createClient<Database>(url, anonKey, options)
  const { error: empleadoError } = await empleado.auth.signInWithPassword({ email: emailDeUsuario('juan'), password: juanPassword })
  if (empleadoError) throw empleadoError
  const { error: turnoError } = await empleado.rpc('abrir_turno', { p_fondo_gs: 100000, p_fondo_brl: 0 })
  if (turnoError) throw turnoError
  const ventas: { items: [string, number][]; medio: Database['public']['Enums']['medio_pago']; recibido?: number }[] = [
    { items: [['Empanada de carne', 2], ['Gaseosa 500 ml', 1]], medio: 'efectivo_gs', recibido: 30000 },
    { items: [['Sándwich de carne asada', 1], ['Cerveza Pilsen', 1]], medio: 'efectivo_brl', recibido: 30 },
    { items: [['Empanada de pollo', 3]], medio: 'transferencia' },
    { items: [['Cerveza Munich', 2]], medio: 'tarjeta' },
    { items: [['Agua mineral 500 ml', 1]], medio: 'efectivo_gs', recibido: 5000 },
  ]
  let ultimaVenta = ''
  for (const venta of ventas) {
    const items = venta.items.map(([nombre, cantidad]) => {
      const producto_id = ids.get(nombre)
      if (!producto_id) throw new Error(`Falta el producto ${nombre}`)
      return { producto_id, cantidad }
    })
    const { data, error } = await empleado.rpc('registrar_venta', { p_clave: randomUUID(), p_items: items, p_medio: venta.medio, ...(venta.recibido !== undefined ? { p_monto_recibido: venta.recibido } : {}) })
    if (error) throw error
    if (!data?.[0]) throw new Error('La venta no devolvió un identificador')
    ultimaVenta = data[0].venta_id
  }
  const { error: anulacionError } = await empleado.rpc('anular_venta', { p_venta_id: ultimaVenta, p_motivo: 'Error de carga (demo)' })
  if (anulacionError) throw anulacionError
  console.log(`Creados: 3 categorías, 13 productos, 3 perfiles, 5 ventas (1 anulada), 1 turno abierto y cotización 1450.\nMenú: http://localhost:3000/\nPOS: http://localhost:3000/pos/login\nAdmin: http://localhost:3000/admin/login\nDueña: dueno@oasis.local / ${password}\nEmpleados: juan / 123456; ana / 654321\nArrancá (o reiniciá) npm run dev después de cargar los datos.`)
}

main().catch((error: unknown) => {
  // No imprimir objetos de errores: podrían contener datos sensibles de conexión.
  console.error(error instanceof Error && error.message === mensajeBase ? mensajeBase : 'No se pudieron cargar los datos demo. Revisá la configuración y el estado de la base local.')
  process.exitCode = 1
})

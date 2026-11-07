import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { emailDeUsuario } from '../lib/auth/empleado'
import { derivarPasswordEmpleado } from '../lib/auth/pin-derivacion'
import type { Horarios } from '../lib/admin/horarios'
import type { Database } from '../types/supabase'
import { destinoPermitido } from './seed-demo-destino'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const pepper = process.env.EMPLEADO_PIN_PEPPER
const password = 'Magno2026Oasis'
class DemoError extends Error {}
const mensajeBase = 'La base ya tiene datos. Para empezar de cero: npx supabase db reset (borra la base local) y volvé a correr npm run db:demo.'

async function main() {
  const indiceRemoto = process.argv.indexOf('--remoto')
  const refRemoto = indiceRemoto === -1 ? null : (process.argv[indiceRemoto + 1] ?? '')
  if (!destinoPermitido(url, refRemoto)) {
    throw new DemoError(refRemoto === null
      ? 'Solo se permite cargar datos en Supabase local'
      : 'Destino no permitido: la URL de Supabase no coincide con --remoto <ref>')
  }
  if (!url || !anonKey || !serviceKey) throw new DemoError('Faltan variables de Supabase en .env.local')
  // Validar el pepper antes de realizar cualquier escritura.
  if (!pepper || pepper.length < 32) throw new DemoError('EMPLEADO_PIN_PEPPER falta o tiene menos de 32 caracteres')
  const fedePassword = derivarPasswordEmpleado('fede', '123456', pepper)
  const options = { auth: { persistSession: false, autoRefreshToken: false } }
  const admin = createClient<Database>(url, serviceKey, options)
  for (const tabla of ['categorias', 'perfiles'] as const) {
    const { count, error } = await admin.from(tabla).select('id', { count: 'exact', head: true })
    if (error) throw error
    if (count === null) throw new Error(`No se pudo contar ${tabla}`)
    if (count > 0) throw new DemoError(mensajeBase)
  }

  for (const usuario of [
    { email: 'neiff@patriarca.com.br', password, nombre: 'Neiff', rol: 'dueno' as const, usuario: null },
    { email: emailDeUsuario('fede'), password: fedePassword, nombre: 'Fede', rol: 'empleado' as const, usuario: 'fede' },
  ]) {
    const { data, error } = await admin.auth.admin.createUser({ email: usuario.email, password: usuario.password, email_confirm: true })
    if (error) throw error
    const { error: perfilError } = await admin.from('perfiles').insert({ id: data.user.id, nombre: usuario.nombre, rol: usuario.rol, usuario: usuario.usuario })
    if (perfilError) throw perfilError
  }

  const owner = createClient<Database>(url, anonKey, options)
  const { error: loginError } = await owner.auth.signInWithPassword({ email: 'neiff@patriarca.com.br', password })
  if (loginError) throw loginError
  const { data: categorias, error: categoriasError } = await owner.from('categorias').insert([
    { nombre: 'Comidas', orden: 1 }, { nombre: 'Bebidas sin alcohol', orden: 2 }, { nombre: 'Bebidas con alcohol', orden: 3 },
  ]).select('id, nombre')
  if (categoriasError) throw categoriasError
  const categoria = (nombre: string) => {
    const id = categorias.find((c) => c.nombre === nombre)?.id
    if (!id) throw new DemoError(`Falta la categoría ${nombre}`)
    return id
  }
  const comidas = categoria('Comidas'), sinAlcohol = categoria('Bebidas sin alcohol'), alcohol = categoria('Bebidas con alcohol')
  type Producto = Database['public']['Tables']['productos']['Insert'] & { inicial?: number; foto?: string }
  const productos: Producto[] = [
    { nombre: 'Empanada de carne', descripcion: 'Carne condimentada y cebolla.', precio_gs: 8000, costo_gs: 4000, categoria_id: comidas, inicial: 30 },
    { nombre: 'Empanada de pollo', descripcion: 'Pollo jugoso y verduras.', precio_gs: 8000, costo_gs: 4000, categoria_id: comidas, inicial: 25 },
    { nombre: 'Empanada de choclo', descripcion: 'Choclo cremoso.', precio_gs: 8000, categoria_id: comidas, inicial: 4 },
    { nombre: 'Coxinha', descripcion: 'Masa dorada rellena de pollo.', precio_gs: 8000, costo_gs: 4000, categoria_id: comidas, inicial: 20 },
    { nombre: "Pastel mandi'o", descripcion: 'Mandioca rellena de carne.', precio_gs: 9000, costo_gs: 4500, categoria_id: comidas, inicial: 20 },
    { nombre: 'Chipa', descripcion: 'Chipa de almidón y queso.', precio_gs: 5000, costo_gs: 2500, categoria_id: comidas, inicial: 25 },
    { nombre: 'Mbeju', descripcion: 'Tortilla de almidón y queso.', precio_gs: 12000, costo_gs: 6000, categoria_id: comidas, controla_stock: false },
    { nombre: 'Lomito completo', descripcion: 'Carne, queso, huevo y ensalada.', precio_gs: 40000, costo_gs: 23000, categoria_id: comidas, controla_stock: false },
    { nombre: 'Sándwich de pollo', descripcion: 'Pollo y ensalada en pan fresco.', precio_gs: 25000, costo_gs: 13000, categoria_id: comidas, controla_stock: false },
    { nombre: 'Hamburguesa completa', descripcion: 'Carne, queso y vegetales.', precio_gs: 35000, costo_gs: 18000, categoria_id: comidas, controla_stock: false, foto: 'hamburguesa.webp' },
    { nombre: 'Papas fritas', descripcion: 'Papas doradas con sal.', precio_gs: 15000, costo_gs: 7000, categoria_id: comidas, controla_stock: false },
    { nombre: 'Pancho', descripcion: 'Salchicha en pan con aderezos.', precio_gs: 12000, categoria_id: comidas, inicial: 20 },
    { nombre: 'Agua mineral 500 ml', descripcion: 'Agua sin gas bien fría.', precio_gs: 5000, costo_gs: 2500, categoria_id: sinAlcohol, inicial: 30, foto: 'agua.webp' },
    { nombre: 'Agua con gas 500 ml', descripcion: 'Agua mineral con gas.', precio_gs: 6000, costo_gs: 3000, categoria_id: sinAlcohol, inicial: 20, foto: 'agua.webp' },
    { nombre: 'Gaseosa cola 500 ml', descripcion: 'Gaseosa cola fría.', precio_gs: 8000, costo_gs: 4000, categoria_id: sinAlcohol, inicial: 25, foto: 'gaseosa.webp' },
    { nombre: 'Gaseosa naranja 500 ml', descripcion: 'Gaseosa sabor naranja.', precio_gs: 8000, costo_gs: 4000, categoria_id: sinAlcohol, inicial: 20 },
    { nombre: 'Gaseosa limón 500 ml', descripcion: 'Gaseosa sabor limón.', precio_gs: 8000, costo_gs: 4000, categoria_id: sinAlcohol, inicial: 20 },
    { nombre: 'Jugo de naranja', descripcion: 'Jugo de naranja fresco.', precio_gs: 12000, categoria_id: sinAlcohol, controla_stock: false },
    { nombre: 'Jugo de maracuyá', descripcion: 'Jugo fresco de maracuyá.', precio_gs: 12000, costo_gs: 5000, categoria_id: sinAlcohol, controla_stock: false },
    { nombre: 'Tereré', descripcion: 'Yerba y agua fría con hielo.', precio_gs: 10000, costo_gs: 4000, categoria_id: sinAlcohol, controla_stock: false },
    { nombre: 'Cocido', descripcion: 'Cocido paraguayo caliente.', precio_gs: 7000, costo_gs: 2500, categoria_id: sinAlcohol, controla_stock: false },
    { nombre: 'Té helado', descripcion: 'Té frío con limón.', precio_gs: 10000, categoria_id: sinAlcohol, inicial: 3 },
    { nombre: 'Cerveza Pilsen lata', descripcion: 'Pilsen fría en lata.', precio_gs: 12000, costo_gs: 7000, categoria_id: alcohol, inicial: 30, foto: 'cerveza.webp' },
    { nombre: 'Cerveza Pilsen botella', descripcion: 'Pilsen fría en botella.', precio_gs: 18000, costo_gs: 10000, categoria_id: alcohol, inicial: 20, foto: 'cerveza.webp' },
    { nombre: 'Cerveza Munich lata', descripcion: 'Munich fría en lata.', precio_gs: 12000, costo_gs: 7000, categoria_id: alcohol, inicial: 20, foto: 'cerveza.webp' },
    { nombre: 'Cerveza Munich botella', descripcion: 'Munich fría en botella.', precio_gs: 18000, costo_gs: 10000, categoria_id: alcohol, inicial: 20, foto: 'cerveza.webp' },
    { nombre: 'Cerveza Brahma lata', descripcion: 'Brahma fría en lata.', precio_gs: 12000, costo_gs: 7000, categoria_id: alcohol, inicial: 20, foto: 'cerveza.webp' },
    { nombre: 'Cerveza Brahma botella', descripcion: 'Brahma fría en botella.', precio_gs: 18000, costo_gs: 10000, categoria_id: alcohol, inicial: 20, foto: 'cerveza.webp' },
    { nombre: 'Cerveza sin filtrar', descripcion: 'Cerveza rubia artesanal.', precio_gs: 20000, categoria_id: alcohol, inicial: 5, foto: 'cerveza.webp' },
    { nombre: 'Fernet con cola', descripcion: 'Fernet, cola y hielo.', precio_gs: 25000, costo_gs: 12000, categoria_id: alcohol, controla_stock: false },
    { nombre: 'Caipirinha', descripcion: 'Cachaça, lima y hielo.', precio_gs: 30000, costo_gs: 14000, categoria_id: alcohol, controla_stock: false },
    { nombre: 'Vino tinto copa', descripcion: 'Copa de vino tinto.', precio_gs: 20000, costo_gs: 9000, categoria_id: alcohol, controla_stock: false },
  ]
  const ids = new Map<string, string>()
  for (const { inicial, foto, ...producto } of productos) {
    if (foto) {
      let bytes: Buffer | undefined
      try { bytes = await readFile(join(process.cwd(), 'scripts/demo-fotos', foto)) }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      }
      if (bytes) {
        const path = `productos/${randomUUID()}.webp`
        const { error } = await owner.storage.from('imagenes').upload(path, bytes, { contentType: 'image/webp' })
        if (error) throw error
        producto.foto_path = path
      }
    }
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
  const { error: empleadoError } = await empleado.auth.signInWithPassword({ email: emailDeUsuario('fede'), password: fedePassword })
  if (empleadoError) throw empleadoError
  const { error: turnoError } = await empleado.rpc('abrir_turno', { p_fondo_gs: 200000, p_fondo_brl: 0 })
  if (turnoError) throw turnoError
  const ventas: { items: [string, number][]; medio: Database['public']['Enums']['medio_pago']; recibido?: number }[] = [
    { items: [['Empanada de carne', 2], ['Gaseosa cola 500 ml', 1]], medio: 'efectivo_gs', recibido: 30000 },
    { items: [['Lomito completo', 1]], medio: 'efectivo_brl', recibido: 30 },
    { items: [['Empanada de pollo', 3]], medio: 'transferencia' },
    { items: [['Cerveza Munich lata', 2]], medio: 'tarjeta' },
    { items: [['Agua mineral 500 ml', 1]], medio: 'efectivo_gs', recibido: 5000 },
    { items: [['Hamburguesa completa', 1]], medio: 'efectivo_brl', recibido: 30 },
    { items: [['Chipa', 2], ['Cocido', 1]], medio: 'transferencia' },
    { items: [['Coxinha', 2]], medio: 'tarjeta' },
    { items: [['Pancho', 1], ['Cerveza Pilsen lata', 1]], medio: 'efectivo_gs', recibido: 25000 },
    { items: [['Papas fritas', 1], ['Jugo de naranja', 1]], medio: 'efectivo_gs', recibido: 30000 },
    { items: [['Mbeju', 1]], medio: 'efectivo_brl', recibido: 10 },
    { items: [['Caipirinha', 1]], medio: 'efectivo_brl', recibido: 25 },
  ]
  for (const venta of ventas) {
    const items = venta.items.map(([nombre, cantidad]) => {
      const producto_id = ids.get(nombre)
      if (!producto_id) throw new DemoError(`Falta el producto ${nombre}`)
      return { producto_id, cantidad }
    })
    const { error } = await empleado.rpc('registrar_venta', { p_clave: randomUUID(), p_items: items, p_medio: venta.medio, ...(venta.recibido !== undefined ? { p_monto_recibido: venta.recibido } : {}) })
    if (error) throw error
  }
  console.log(`Creados: 3 categorías, 32 productos, 2 perfiles, 12 ventas, 0 movimientos de caja, 1 turno abierto y cotización 1450.
Menú: http://localhost:3000/
POS: http://localhost:3000/pos/login
Admin: http://localhost:3000/admin/login
Dueño: neiff@patriarca.com.br / ${password}
Empleado: fede / 123456
Fotos: Unsplash (ver scripts/demo-fotos/CREDITOS.md).
Arrancá (o reiniciá) npm run dev después de cargar los datos.`)
}

main().catch((error: unknown) => {
  // No imprimir objetos de errores: podrían contener datos sensibles de conexión.
  console.error(error instanceof DemoError ? error.message : 'No se pudieron cargar los datos demo. Revisá la configuración y el estado de la base local.')
  process.exitCode = 1
})

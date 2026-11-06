import { cacheLife, cacheTag } from 'next/cache'
import { TAG_MENU } from '@/lib/cache'
import { crearClientePublico } from '@/lib/supabase/publico'
import { armarMenu, type DatosMenu } from './armar'

export type { DatosMenu, ProductoMenu, SeccionMenu } from './armar'

export async function cargarMenu(): Promise<DatosMenu> {
  'use cache'
  cacheTag(TAG_MENU)
  cacheLife('hours')
  const cliente = crearClientePublico()
  const [categorias, productos, config] = await Promise.all([
    cliente.from('categorias').select('id, nombre, orden'),
    cliente.from('productos').select('id, categoria_id, nombre, descripcion, foto_path, precio_gs, stock, controla_stock'),
    cliente.from('configuracion').select('nombre, logo_path, horarios, whatsapp, instagram, ubicacion').eq('id', 1).maybeSingle(),
  ])
  if (categorias.error) throw categorias.error
  if (productos.error) throw productos.error
  if (config.error) throw config.error
  return armarMenu({ categorias: categorias.data, productos: productos.data, config: config.data })
}

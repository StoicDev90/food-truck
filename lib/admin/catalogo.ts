'use server'

import { updateTag } from 'next/cache'
import { unstable_rethrow } from 'next/navigation'
import { requerirAcceso } from '@/lib/auth/sesion'
import { crearClienteServidor } from '@/lib/supabase/server'
import { fallo, invalido, enteroValido, textoValido, uuidValido, type Resultado } from '@/lib/acciones/resultado'
import { codigoDeError } from '@/lib/errores'
import { pathImagenValido } from '@/lib/imagenes'
import { TAG_MENU } from '@/lib/cache'

export type EntradaProducto = { categoriaId: string; nombre: string; descripcion: string; precioGs: number; costoGs: number | null; controlaStock: boolean; visible: boolean; fotoPath: string | null }

function valido(e: EntradaProducto) {
  return e && typeof e === 'object' && uuidValido(e.categoriaId) && textoValido(e.nombre, 80) && e.nombre.length <= 80 && typeof e.descripcion === 'string' && e.descripcion.length <= 200 && enteroValido(e.precioGs) && (e.costoGs === null || enteroValido(e.costoGs)) && typeof e.controlaStock === 'boolean' && typeof e.visible === 'boolean' && (e.fotoPath === null || pathImagenValido(e.fotoPath, 'productos'))
}
function campos(e: EntradaProducto) {
  return { categoria_id: e.categoriaId, nombre: e.nombre.trim(), descripcion: e.descripcion.trim(), precio_gs: e.precioGs, costo_gs: e.costoGs, controla_stock: e.controlaStock, visible: e.visible, foto_path: e.fotoPath }
}
export async function crearProducto(e: EntradaProducto): Promise<Resultado<{ id: string }>> {
  try {
    await requerirAcceso('admin')
    if (!valido(e)) return invalido()
    const db = await crearClienteServidor()
    const { data, error } = await db.from('productos').insert(campos(e)).select('id').single()
    if (error) return fallo(codigoDeError(error))
    updateTag(TAG_MENU)
    return { ok: true, data: { id: data.id } }
  } catch (e) { unstable_rethrow(e); return fallo(null) }
}
export async function editarProducto(id: string, e: EntradaProducto): Promise<Resultado<null>> {
  try {
    await requerirAcceso('admin')
    if (!uuidValido(id) || !valido(e)) return invalido()
    const db = await crearClienteServidor()
    const { data: anterior, error: errorLectura } = await db.from('productos').select('foto_path').eq('id', id).single()
    if (errorLectura) return fallo(codigoDeError(errorLectura))
    const { error } = await db.from('productos').update(campos(e)).eq('id', id)
    if (error) return fallo(codigoDeError(error))
    updateTag(TAG_MENU)
    if (anterior.foto_path && anterior.foto_path !== e.fotoPath && pathImagenValido(anterior.foto_path, 'productos')) {
      try { await db.storage.from('imagenes').remove([anterior.foto_path]) } catch { /* La edición ya se guardó. */ }
    }
    return { ok: true, data: null }
  } catch (e) { unstable_rethrow(e); return fallo(null) }
}
export async function cambiarActivoProducto(id: string, activo: boolean): Promise<Resultado<null>> {
  try {
    await requerirAcceso('admin')
    if (!uuidValido(id) || typeof activo !== 'boolean') return invalido()
    const db = await crearClienteServidor()
    const { error } = await db.from('productos').update({ activo }).eq('id', id)
    if (error) return fallo(codigoDeError(error))
    updateTag(TAG_MENU); return { ok: true, data: null }
  } catch (e) { unstable_rethrow(e); return fallo(null) }
}
export async function crearCategoria(nombre: string, orden: number): Promise<Resultado<null>> {
  try {
    await requerirAcceso('admin')
    if (!textoValido(nombre, 80) || !enteroValido(orden)) return invalido()
    const db = await crearClienteServidor()
    const { error } = await db.from('categorias').insert({ nombre: nombre.trim(), orden })
    if (error) return fallo(codigoDeError(error))
    updateTag(TAG_MENU); return { ok: true, data: null }
  } catch (e) { unstable_rethrow(e); return fallo(null) }
}
export async function editarCategoria(id: string, nombre: string, orden: number): Promise<Resultado<null>> {
  try {
    await requerirAcceso('admin')
    if (!uuidValido(id) || !textoValido(nombre, 80) || !enteroValido(orden)) return invalido()
    const db = await crearClienteServidor()
    const { error } = await db.from('categorias').update({ nombre: nombre.trim(), orden }).eq('id', id)
    if (error) return fallo(codigoDeError(error))
    updateTag(TAG_MENU); return { ok: true, data: null }
  } catch (e) { unstable_rethrow(e); return fallo(null) }
}
export async function borrarCategoria(id: string): Promise<Resultado<null>> {
  try {
    await requerirAcceso('admin')
    if (!uuidValido(id)) return invalido()
    const db = await crearClienteServidor()
    const { error } = await db.from('categorias').delete().eq('id', id)
    if (error) return fallo(error.code === '23503' ? 'CATEGORIA_EN_USO' : codigoDeError(error))
    updateTag(TAG_MENU); return { ok: true, data: null }
  } catch (e) { unstable_rethrow(e); return fallo(null) }
}

'use server'

import { updateTag } from 'next/cache'
import { unstable_rethrow } from 'next/navigation'
import { requerirAcceso } from '@/lib/auth/sesion'
import { crearClienteServidor } from '@/lib/supabase/server'
import { fallo, invalido, motivoValido, uuidValido, type Resultado } from '@/lib/acciones/resultado'
import { codigoDeError } from '@/lib/errores'
import { TAG_MENU } from '@/lib/cache'

export async function ingresarStock(productoId: string, cantidad: number, motivo: string): Promise<Resultado<{ stock: number }>> {
  try {
    await requerirAcceso('admin')
    if (!uuidValido(productoId) || !Number.isSafeInteger(cantidad) || typeof motivo !== 'string') return invalido()
    if (cantidad < 1) return fallo('CANTIDAD_INVALIDA')
    const db = await crearClienteServidor()
    const { data, error } = await db.rpc('registrar_ingreso_stock', { p_producto_id: productoId, p_cantidad: cantidad, ...(motivo.trim() ? { p_motivo: motivo.trim() } : {}) })
    if (error) return fallo(codigoDeError(error))
    updateTag(TAG_MENU)
    return { ok: true, data: { stock: data } }
  } catch (e) { unstable_rethrow(e); return fallo(null) }
}

export async function ajustarStock(productoId: string, cantidad: number, motivo: string): Promise<Resultado<{ stock: number }>> {
  try {
    await requerirAcceso('admin')
    if (!uuidValido(productoId) || !Number.isSafeInteger(cantidad) || typeof motivo !== 'string') return invalido()
    if (cantidad === 0) return fallo('CANTIDAD_INVALIDA')
    if (!motivoValido(motivo)) return fallo('MOTIVO_REQUERIDO')
    const db = await crearClienteServidor()
    const { data, error } = await db.rpc('ajustar_stock', { p_producto_id: productoId, p_cantidad: cantidad, p_motivo: motivo.trim() })
    if (error) return fallo(codigoDeError(error))
    updateTag(TAG_MENU)
    return { ok: true, data: { stock: data } }
  } catch (e) { unstable_rethrow(e); return fallo(null) }
}

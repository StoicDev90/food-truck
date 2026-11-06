'use server'

import { updateTag } from 'next/cache'
import { unstable_rethrow } from 'next/navigation'
import { requerirAcceso } from '@/lib/auth/sesion'
import { crearClienteServidor } from '@/lib/supabase/server'
import { fallo, invalido, textoValido, type Resultado } from '@/lib/acciones/resultado'
import { codigoDeError } from '@/lib/errores'
import { pathImagenValido } from '@/lib/imagenes'
import { TAG_MENU } from '@/lib/cache'
import { validarHorarios, type Horarios } from './horarios'

export type EntradaNegocio = { nombre: string; whatsapp: string; instagram: string; ubicacion: string; horarios: Horarios; logoPath: string | null }

export async function guardarNegocio(e: EntradaNegocio): Promise<Resultado<null>> {
  try {
    await requerirAcceso('admin')
    if (!e || !textoValido(e.nombre, 60) || e.nombre.length > 60 || typeof e.whatsapp !== 'string' || !/^(?:\d{8,15})?$/.test(e.whatsapp) || typeof e.instagram !== 'string' || !/^(?:[A-Za-z0-9._]{1,30})?$/.test(e.instagram) || typeof e.ubicacion !== 'string' || !(e.logoPath === null || pathImagenValido(e.logoPath, 'marca'))) return invalido()
    if (e.ubicacion) {
      try { const url = new URL(e.ubicacion); if (!e.ubicacion.startsWith('https://') || url.protocol !== 'https:') return invalido() } catch { return invalido() }
    }
    const horarios = validarHorarios(e.horarios)
    if (!horarios) return invalido()
    const db = await crearClienteServidor()
    const { error } = await db.from('configuracion').update({ nombre: e.nombre.trim(), whatsapp: e.whatsapp || null, instagram: e.instagram || null, ubicacion: e.ubicacion || null, horarios, logo_path: e.logoPath }).eq('id', 1)
    if (error) return fallo(codigoDeError(error))
    updateTag(TAG_MENU)
    return { ok: true, data: null }
  } catch (e) { unstable_rethrow(e); return fallo(null) }
}

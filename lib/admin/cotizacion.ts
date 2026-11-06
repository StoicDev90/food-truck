'use server'

import { unstable_rethrow } from 'next/navigation'
import { requerirAcceso } from '@/lib/auth/sesion'
import { crearClienteServidor } from '@/lib/supabase/server'
import { fallo, invalido, type Resultado } from '@/lib/acciones/resultado'
import { codigoDeError } from '@/lib/errores'
import { decimalesAEntero } from '@/lib/pos/redondeo'

export async function fijarCotizacionManual(valor: number): Promise<Resultado<null>> {
  try {
    await requerirAcceso('admin')
    if (!Number.isFinite(valor) || valor <= 0 || valor > Number.MAX_SAFE_INTEGER / 100 || Number(decimalesAEntero(valor, 2)) / 100 !== valor) return invalido()
    const db = await crearClienteServidor()
    const { error } = await db.rpc('fijar_cotizacion_manual', { p_valor: valor })
    if (error) return fallo(codigoDeError(error))
    return { ok: true, data: null }
  } catch (e) { unstable_rethrow(e); return fallo(null) }
}

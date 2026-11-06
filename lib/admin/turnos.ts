'use server'
import { unstable_rethrow } from 'next/navigation'
import { requerirAcceso } from '@/lib/auth/sesion'
import { crearClienteServidor } from '@/lib/supabase/server'
import { fallo, invalido, enteroValido, montoValido, motivoValido, uuidValido, type Resultado } from '@/lib/acciones/resultado'
import { codigoDeError } from '@/lib/errores'
import { mapResumen, type ResumenCaja } from '@/lib/caja/resumen'

export async function cerrarTurnoForzado(turnoId: string, contadoGs: number, contadoBrl: number): Promise<Resultado<ResumenCaja>> {
  try {
    await requerirAcceso('admin')
    if (!uuidValido(turnoId) || !enteroValido(contadoGs) || !montoValido(contadoBrl) || Math.abs(contadoBrl * 100 - Math.round(contadoBrl * 100)) > 1e-7) return invalido()
    const db = await crearClienteServidor()
    const { data, error } = await db.rpc('cerrar_turno', { p_turno_id: turnoId, p_contado_gs: contadoGs, p_contado_brl: contadoBrl })
    if (error) return fallo(codigoDeError(error))
    return data ? { ok: true, data: mapResumen(data) } : fallo(null)
  } catch (e) { unstable_rethrow(e); return fallo(null) }
}
export async function corregirConteo(turnoId: string, contadoGs: number, contadoBrl: number, motivo: string): Promise<Resultado<null>> {
  try {
    await requerirAcceso('admin')
    if (!uuidValido(turnoId) || !enteroValido(contadoGs) || !montoValido(contadoBrl) || Math.abs(contadoBrl * 100 - Math.round(contadoBrl * 100)) > 1e-7 || typeof motivo !== 'string') return invalido()
    if (!motivoValido(motivo)) return fallo('MOTIVO_REQUERIDO')
    const db = await crearClienteServidor()
    const { error } = await db.rpc('corregir_conteo', { p_turno_id: turnoId, p_contado_gs: contadoGs, p_contado_brl: contadoBrl, p_motivo: motivo.trim() })
    return error ? fallo(codigoDeError(error)) : { ok: true, data: null }
  } catch (e) { unstable_rethrow(e); return fallo(null) }
}

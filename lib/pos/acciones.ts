'use server'

import { updateTag } from 'next/cache'
import { unstable_rethrow } from 'next/navigation'
import { requerirAcceso } from '@/lib/auth/sesion'
import { crearClienteServidor } from '@/lib/supabase/server'
import { codigoDeError, MENSAJES_ERROR, type CodigoError } from '@/lib/errores'
import { TAG_MENU } from '@/lib/cache'
import type { MedioPago } from './cobro'

export type Resultado<T> = { ok: true; data: T } | { ok: false; error: string; codigo: CodigoError | null }
export type ResumenCaja = { esperadoGs: number; esperadoBrl: number; contadoGs: number; contadoBrl: number; diferenciaGs: number; diferenciaBrl: number; transferenciasGs: number; tarjetasGs: number }
type VentaTurno = { id: string; createdAt: string; totalGs: number; medio: MedioPago; estado: 'confirmada' | 'anulada'; empleadoNombre: string }

const fallo = (codigo: CodigoError | null): Resultado<never> => ({ ok: false, codigo, error: codigo ? MENSAJES_ERROR[codigo] : 'No se pudo completar. Probá de nuevo.' })
const invalido = () => fallo('VALOR_INVALIDO')
const montoValido = (n: number) => Number.isFinite(n) && n >= 0
const enteroValido = (n: number) => Number.isSafeInteger(n) && n >= 0
const uuidValido = (s: string) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
const motivoValido = (s: string) => typeof s === 'string' && s.trim().length > 0

export async function abrirTurno(fondoGs: number, fondoBrl: number): Promise<Resultado<null>> {
  try {
    await requerirAcceso('pos')
    if (!enteroValido(fondoGs) || !montoValido(fondoBrl)) return invalido()
    const db = await crearClienteServidor()
    const { error } = await db.rpc('abrir_turno', { p_fondo_gs: fondoGs, p_fondo_brl: fondoBrl })
    return error ? fallo(codigoDeError(error)) : { ok: true, data: null }
  } catch (error) {
    unstable_rethrow(error)
    return fallo(null)
  }
}

export async function registrarVenta(input: { clave: string; items: { producto_id: string; cantidad: number }[]; medio: MedioPago; montoRecibido: number | null }): Promise<Resultado<{ ventaId: string; totalGs: number; vueltoGs: number }>> {
  try {
    await requerirAcceso('pos')
    if (!input || typeof input !== 'object' || !uuidValido(input.clave) || !Array.isArray(input.items) || input.items.some(i => !i || typeof i !== 'object' || !uuidValido(i.producto_id) || !Number.isSafeInteger(i.cantidad) || i.cantidad < 1) || (input.montoRecibido !== null && !montoValido(input.montoRecibido))) return invalido()
    const db = await crearClienteServidor()
    const { data, error } = await db.rpc('registrar_venta', { p_clave: input.clave, p_items: input.items, p_medio: input.medio, p_monto_recibido: input.montoRecibido as number })
    if (error) return fallo(codigoDeError(error))
    const row = data?.[0]
    if (!row) return fallo(null)
    updateTag(TAG_MENU)
    return { ok: true, data: { ventaId: row.venta_id, totalGs: Number(row.total_gs), vueltoGs: Number(row.vuelto_gs) } }
  } catch (error) {
    unstable_rethrow(error)
    return fallo(null)
  }
}

export async function ventasDelTurno(): Promise<Resultado<VentaTurno[]>> {
  try {
    await requerirAcceso('pos')
    const db = await crearClienteServidor()
    const { data, error } = await db.rpc('ventas_del_turno')
    if (error) return fallo(codigoDeError(error))
    return { ok: true, data: (data ?? []).map(v => ({ id: v.id, createdAt: v.created_at, totalGs: Number(v.total_gs), medio: v.medio, estado: v.estado, empleadoNombre: v.empleado_nombre })) }
  } catch (error) {
    unstable_rethrow(error)
    return fallo(null)
  }
}

export async function anularVenta(ventaId: string, motivo: string): Promise<Resultado<null>> {
  try {
    await requerirAcceso('pos')
    if (!uuidValido(ventaId) || !motivoValido(motivo)) return invalido()
    const db = await crearClienteServidor()
    const { error } = await db.rpc('anular_venta', { p_venta_id: ventaId, p_motivo: motivo })
    if (error) return fallo(codigoDeError(error))
    updateTag(TAG_MENU)
    return { ok: true, data: null }
  } catch (error) {
    unstable_rethrow(error)
    return fallo(null)
  }
}

export async function ingresarStock(productoId: string, cantidad: number, motivo: string | null): Promise<Resultado<null>> {
  try {
    await requerirAcceso('pos')
    if (!uuidValido(productoId) || !Number.isSafeInteger(cantidad) || cantidad < 1) return invalido()
    const db = await crearClienteServidor()
    const { error } = await db.rpc('registrar_ingreso_stock', { p_producto_id: productoId, p_cantidad: cantidad, p_motivo: motivo as string })
    if (error) return fallo(codigoDeError(error))
    updateTag(TAG_MENU)
    return { ok: true, data: null }
  } catch (error) {
    unstable_rethrow(error)
    return fallo(null)
  }
}

export async function registrarMovimientoCaja(input: { sentido: 'entrada' | 'salida'; tipo: 'retiro' | 'pago_proveedor' | 'aporte_cambio' | 'cambio_moneda' | 'otro'; moneda: 'PYG' | 'BRL'; monto: number; motivo: string }): Promise<Resultado<null>> {
  try {
    const perfil = await requerirAcceso('pos')
    if (perfil.rol !== 'dueno') return fallo('NO_AUTORIZADO')
    if (!input || typeof input !== 'object' || !montoValido(input.monto) || !motivoValido(input.motivo)) return invalido()
    const db = await crearClienteServidor()
    const { error } = await db.rpc('registrar_movimiento_caja', { p_sentido: input.sentido, p_tipo: input.tipo, p_moneda: input.moneda, p_monto: input.monto, p_motivo: input.motivo })
    return error ? fallo(codigoDeError(error)) : { ok: true, data: null }
  } catch (error) {
    unstable_rethrow(error)
    return fallo(null)
  }
}

export async function cerrarTurno(turnoId: string, contadoGs: number, contadoBrl: number): Promise<Resultado<ResumenCaja>> {
  try {
    await requerirAcceso('pos')
    if (!uuidValido(turnoId) || !enteroValido(contadoGs) || !montoValido(contadoBrl)) return invalido()
    const db = await crearClienteServidor()
    const { data: r, error } = await db.rpc('cerrar_turno', { p_turno_id: turnoId, p_contado_gs: contadoGs, p_contado_brl: contadoBrl })
    if (error) return fallo(codigoDeError(error))
    if (!r) return fallo(null)
    return { ok: true, data: { esperadoGs: Number(r.esperado_gs), esperadoBrl: Number(r.esperado_brl), contadoGs: Number(r.contado_gs), contadoBrl: Number(r.contado_brl), diferenciaGs: Number(r.diferencia_gs), diferenciaBrl: Number(r.diferencia_brl), transferenciasGs: Number(r.transferencias_gs), tarjetasGs: Number(r.tarjetas_gs) } }
  } catch (error) {
    unstable_rethrow(error)
    return fallo(null)
  }
}

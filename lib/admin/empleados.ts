'use server'

import { unstable_rethrow } from 'next/navigation'
import { requerirAcceso } from '@/lib/auth/sesion'
import { validarUsuario, validarPin, normalizarUsuario, emailDeUsuario } from '@/lib/auth/empleado'
import { passwordEmpleado } from '@/lib/auth/pin'
import { claveCuentaEmpleado } from '@/lib/auth/claves-login'
import { crearClienteAdmin } from '@/lib/supabase/admin'
import { fallo, invalido, textoValido, uuidValido, type Resultado } from '@/lib/acciones/resultado'

export async function crearEmpleado(e: { nombre: string; usuario: string; pin: string }): Promise<Resultado<{ id: string }>> {
  try {
    await requerirAcceso('admin')
    if (!e || !textoValido(e.nombre, 80) || typeof e.usuario !== 'string' || !validarUsuario(e.usuario) || typeof e.pin !== 'string' || !validarPin(e.pin)) return invalido()
    const usuario = normalizarUsuario(e.usuario)
    const db = crearClienteAdmin()
    const { data, error } = await db.auth.admin.createUser({ email: emailDeUsuario(usuario), password: passwordEmpleado(usuario, e.pin), email_confirm: true })
    if (error) return fallo(error.code === 'email_exists' || error.code === 'user_already_exists' ? 'USUARIO_EXISTE' : null)
    const { error: perfilError } = await db.from('perfiles').insert({ id: data.user.id, nombre: e.nombre.trim(), usuario, rol: 'empleado' })
    if (perfilError) {
      try {
        const { error: deleteError } = await db.auth.admin.deleteUser(data.user.id)
        if (deleteError) return fallo('EMPLEADO_ALTA_INCOMPLETA')
      } catch (e) { unstable_rethrow(e); return fallo('EMPLEADO_ALTA_INCOMPLETA') }
      return fallo(perfilError.code === '23505' ? 'USUARIO_EXISTE' : null)
    }
    return { ok: true, data: { id: data.user.id } }
  } catch (e) { unstable_rethrow(e); return fallo(null) }
}

async function objetivo(db: ReturnType<typeof crearClienteAdmin>, id: string) {
  const { data, error } = await db.from('perfiles').select('rol,usuario').eq('id', id).maybeSingle()
  if (error) throw error
  return data?.rol === 'empleado' && data.usuario ? data.usuario : null
}
export async function resetearPin(id: string, pin: string): Promise<Resultado<null>> {
  try {
    await requerirAcceso('admin')
    if (!uuidValido(id) || typeof pin !== 'string' || !validarPin(pin)) return invalido()
    const db = crearClienteAdmin(); const usuario = await objetivo(db, id)
    if (!usuario) return fallo('NO_AUTORIZADO')
    const { error } = await db.auth.admin.updateUserById(id, { password: passwordEmpleado(usuario, pin) })
    if (error) return fallo(null)
    try {
      const borrado = await db.from('intentos_login').delete().eq('clave', claveCuentaEmpleado(usuario))
      if (borrado.error) return fallo('PIN_ACTUALIZADO_SIN_DESBLOQUEAR')
    } catch (e) { unstable_rethrow(e); return fallo('PIN_ACTUALIZADO_SIN_DESBLOQUEAR') }
    return { ok: true, data: null }
  } catch (e) { unstable_rethrow(e); return fallo(null) }
}
export async function cambiarActivoEmpleado(id: string, activo: boolean): Promise<Resultado<null>> {
  try {
    await requerirAcceso('admin')
    if (!uuidValido(id) || typeof activo !== 'boolean') return invalido()
    const db = crearClienteAdmin(); const usuario = await objetivo(db, id)
    if (!usuario) return fallo('NO_AUTORIZADO')
    const { error } = await db.from('perfiles').update({ activo }).eq('id', id).eq('rol', 'empleado')
    return error ? fallo(null) : { ok: true, data: null }
  } catch (e) { unstable_rethrow(e); return fallo(null) }
}
export async function desbloquearEmpleado(id: string): Promise<Resultado<null>> {
  try {
    await requerirAcceso('admin')
    if (!uuidValido(id)) return invalido()
    const db = crearClienteAdmin(); const usuario = await objetivo(db, id)
    if (!usuario) return fallo('NO_AUTORIZADO')
    const { error } = await db.from('intentos_login').delete().eq('clave', claveCuentaEmpleado(usuario))
    return error ? fallo(null) : { ok: true, data: null }
  } catch (e) { unstable_rethrow(e); return fallo(null) }
}

import 'server-only'
import { crearClienteAdmin } from '@/lib/supabase/admin'

export { claveCuentaDueno, claveCuentaEmpleado, ipDeEncabezados } from './claves-login'

export const MENSAJE_BLOQUEO = 'Demasiados intentos fallidos. Esperá unos minutos y volvé a probar.'

// Fail-closed: si el contador falla, se lanza y el login no procede.
export async function estaBloqueado(cuenta: string, ip: string): Promise<boolean> {
  const { data, error } = await crearClienteAdmin().rpc('login_bloqueado', { p_cuenta: cuenta, p_ip: ip })
  if (error) throw error
  return data
}

export async function registrarFallo(cuenta: string, ip: string): Promise<void> {
  const { error } = await crearClienteAdmin().rpc('registrar_fallo_login', { p_cuenta: cuenta, p_ip: ip })
  if (error) throw error
}

export async function limpiarFallos(cuenta: string): Promise<void> {
  const { error } = await crearClienteAdmin().rpc('limpiar_fallos_login', { p_cuenta: cuenta })
  if (error) throw error
}

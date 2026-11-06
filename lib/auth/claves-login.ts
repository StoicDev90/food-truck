import { normalizarUsuario } from './empleado'

export const claveCuentaEmpleado = (usuario: string): string => 'usuario:' + normalizarUsuario(usuario)

export const claveCuentaDueno = (email: string): string => 'email:' + email.trim().toLowerCase()

export function ipDeEncabezados(h: Headers): string {
  const xff = h.get('x-forwarded-for')?.split(',')[0]?.trim()
  return 'ip:' + (xff || h.get('x-real-ip')?.trim() || 'desconocida')
}

import { normalizarUsuario } from './empleado'

export const claveCuentaEmpleado = (usuario: string): string => 'usuario:' + normalizarUsuario(usuario)

export const claveCuentaDueno = (email: string): string => 'email:' + email.trim().toLowerCase()

// La IP del cliente solo es confiable detrás de Vercel, que fija x-vercel-forwarded-for;
// x-forwarded-for lo puede falsear el cliente. El límite por cuenta es independiente de la IP.
export function ipDeEncabezados(h: Headers): string {
  const primero = (v: string | null) => v?.split(',')[0]?.trim()
  const ip =
    primero(h.get('x-vercel-forwarded-for')) ||
    primero(h.get('x-real-ip')) ||
    primero(h.get('x-forwarded-for'))
  return 'ip:' + (ip || 'desconocida')
}

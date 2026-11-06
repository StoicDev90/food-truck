import { createHmac } from 'node:crypto'
import { normalizarUsuario } from './empleado'

// Derivación pura (sin server-only) para poder usarla en tests de base de datos.
// El PIN nunca es la contraseña de Supabase Auth: sin el pepper no se pueden probar PINs
// contra el endpoint público /auth/v1/token.
export function derivarPasswordEmpleado(usuario: string, pin: string, pepper: string | undefined): string {
  if (!pepper || pepper.length < 32) {
    throw new Error('EMPLEADO_PIN_PEPPER falta o tiene menos de 32 caracteres')
  }
  return createHmac('sha256', pepper)
    .update(normalizarUsuario(usuario) + ':' + pin)
    .digest('base64url')
}

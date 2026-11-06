import 'server-only'
import { derivarPasswordEmpleado } from './pin-derivacion'

// Se lee el entorno en cada llamada (no al importar): el build no necesita el secreto.
export const passwordEmpleado = (usuario: string, pin: string): string =>
  derivarPasswordEmpleado(usuario, pin, process.env.EMPLEADO_PIN_PEPPER)

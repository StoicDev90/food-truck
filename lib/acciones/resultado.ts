import { MENSAJES_ERROR, type CodigoError } from '@/lib/errores'

export type Resultado<T> = { ok: true; data: T } | { ok: false; error: string; codigo: CodigoError | null }
export const fallo = (codigo: CodigoError | null): Resultado<never> => ({ ok: false, codigo, error: codigo ? MENSAJES_ERROR[codigo] : 'No se pudo completar. Probá de nuevo.' })
export const invalido = () => fallo('VALOR_INVALIDO')
export const montoValido = (n: number) => Number.isFinite(n) && n >= 0
export const enteroValido = (n: number) => Number.isSafeInteger(n) && n >= 0
export const uuidValido = (s: string) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
export const motivoValido = (s: string) => typeof s === 'string' && s.trim().length > 0
export const textoValido = (s: string, max: number) => typeof s === 'string' && s.trim().length >= 1 && s.trim().length <= max

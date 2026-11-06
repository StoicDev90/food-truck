import 'server-only'
import { hoyPy } from '@/lib/admin/fechas'

export const URL_COTIZACION = 'https://allratestoday.com/api/v1/central-bank/bcp/latest?source=BRL&target=PYG'
const DIA = 86_400_000
function fechaMs(fecha: unknown): number | null {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null
  const ms = Date.parse(`${fecha}T00:00:00Z`)
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === fecha ? ms : null
}
export function validarCotizacion(json: unknown, hoy: string): { valor: number; fechaPublicacion: string } | null {
  if (!json || typeof json !== 'object') return null
  const dato = json as Record<string, unknown>
  const fecha = fechaMs(dato.rate_date), actual = fechaMs(hoy)
  if (dato.bank !== 'bcp' || dato.source !== 'BRL' || dato.target !== 'PYG' || dato.derived !== false || typeof dato.rate !== 'number' || !Number.isFinite(dato.rate) || dato.rate < 500 || dato.rate > 5000 || fecha === null || actual === null || fecha > actual || fecha < actual - 5 * DIA) return null
  return { valor: Math.round(dato.rate * 100) / 100, fechaPublicacion: dato.rate_date as string }
}
export async function obtenerCotizacionBcp(f: typeof fetch = fetch): Promise<{ valor: number; fechaPublicacion: string } | null> {
  const clave = process.env.ALLRATES_API_KEY
  if (!clave) return null
  try {
    const respuesta = await f(URL_COTIZACION, { headers: { Authorization: `Bearer ${clave}` }, signal: AbortSignal.timeout(10_000) })
    if (respuesta.status !== 200) return null
    return validarCotizacion(await respuesta.json(), hoyPy())
  } catch { return null }
}

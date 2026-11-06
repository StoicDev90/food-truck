const ZONA = 'America/Asuncion'
const DIA = 86_400_000
export const MAX_DIAS_RANGO = 366

export function hoyPy(ahora = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(ahora)
  const valor = (tipo: string) => partes.find(p => p.type === tipo)?.value
  return `${valor('year')}-${valor('month')}-${valor('day')}`
}
function fechaMs(s: string | undefined): number | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const n = Date.parse(`${s}T00:00:00Z`)
  return Number.isFinite(n) && new Date(n).toISOString().slice(0, 10) === s ? n : null
}
export function rangoDeParams(p: { desde?: string; hasta?: string }, diasPorDefecto: number, ahora = new Date()): { desde: string; hasta: string } {
  const desde = fechaMs(p.desde), hasta = fechaMs(p.hasta)
  if (desde !== null && hasta !== null && hasta >= desde && (hasta - desde) / DIA + 1 <= MAX_DIAS_RANGO) return { desde: p.desde!, hasta: p.hasta! }
  const hoy = hoyPy(ahora)
  return { desde: new Date(fechaMs(hoy)! - (diasPorDefecto - 1) * DIA).toISOString().slice(0, 10), hasta: hoy }
}
export function formatoFechaHora(iso: string): string {
  const partes = new Intl.DateTimeFormat('es-PY', { timeZone: ZONA, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso))
  const valor = (tipo: string) => partes.find(p => p.type === tipo)?.value
  return `${valor('day')?.padStart(2, '0')}/${valor('month')?.padStart(2, '0')} ${valor('hour')}:${valor('minute')}`
}

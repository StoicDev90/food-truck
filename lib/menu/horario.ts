import { DIAS, type Horarios } from '@/lib/admin/horarios'

export type EstadoNegocio = { abierto: true; cierra: string } | { abierto: false; abre: { dia: (typeof DIAS)[number]; hora: string } | null }
const nombres = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const minutos = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3))
const formato = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Asuncion', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

export function estadoNegocio(horarios: Horarios | null, ahora: Date): EstadoNegocio {
  if (!horarios) return { abierto: false, abre: null }
  const partes = formato.formatToParts(ahora)
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find(p => p.type === tipo)!.value
  const dia = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(valor('weekday'))
  const actual = Number(valor('hour')) * 60 + Number(valor('minute'))
  const anterior = horarios[DIAS[(dia + 6) % 7]]
  if (anterior && minutos(anterior.cierra) <= minutos(anterior.abre) && actual < minutos(anterior.cierra)) return { abierto: true, cierra: anterior.cierra }
  const hoy = horarios[DIAS[dia]]
  if (hoy && actual >= minutos(hoy.abre) && (minutos(hoy.cierra) <= minutos(hoy.abre) || actual < minutos(hoy.cierra))) return { abierto: true, cierra: hoy.cierra }
  for (let offset = 0; offset <= 7; offset++) {
    const siguiente = DIAS[(dia + offset) % 7]
    const horario = horarios[siguiente]
    if (horario && (offset > 0 || minutos(horario.abre) > actual)) return { abierto: false, abre: { dia: siguiente, hora: horario.abre } }
  }
  return { abierto: false, abre: null }
}

export function filasHorario(horarios: Horarios | null): { dia: string; texto: string }[] {
  if (!horarios) return []
  return DIAS.map((dia, i) => ({ dia: nombres[i], texto: horarios[dia] ? `${horarios[dia].abre} – ${horarios[dia].cierra}` : 'Cerrado' }))
}

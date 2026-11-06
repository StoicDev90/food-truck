import { Palmera } from '@/components/marca/Palmera'
import { BotonTema } from '@/components/tema/BotonTema'
import { formatoGs } from '@/lib/pos/formato'
import { MenuTurno } from './MenuTurno'
import type { DatosPos } from '@/lib/pos/datos'

export function BarraPos({ turno, cotizacion, conectado, rol, productos }: { rol: DatosPos['perfil']['rol']; productos: DatosPos['productos']; turno: NonNullable<DatosPos['turno']>; cotizacion: number | null; conectado: boolean }) {
  const hora = new Intl.DateTimeFormat('es-PY', { timeZone: 'America/Asuncion', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(turno.abiertoAt))
  return <header className="relative flex flex-wrap items-center gap-x-6 gap-y-2 bg-sidebar px-4 py-3 text-sidebar-foreground">
    <div className="flex items-center gap-2 font-heading text-xl font-bold"><Palmera size={40} variante="noche" /><span>Oasis Itaipu</span></div>
    <p>Turno: {turno.empleadoNombre} · desde {hora}</p>
    <p className="tabular-nums">{cotizacion === null ? <span className="rounded bg-destructive px-2 py-1 text-destructive-foreground">Sin cotización</span> : `1 R$ = ${formatoGs(cotizacion)}`}</p>
    <p>{conectado ? '● En línea' : '● Desconectado'}</p>
    <div className="ml-auto flex items-center gap-2"><BotonTema className="border-sidebar-border bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar" /><MenuTurno rol={rol} productos={productos} turnoId={turno.id} abierto={hora} /></div>
  </header>
}

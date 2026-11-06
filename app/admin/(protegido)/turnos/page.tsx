import { requerirAcceso } from '@/lib/auth/sesion'
import { crearClienteServidor } from '@/lib/supabase/server'
import { rangoDeParams, formatoFechaHora } from '@/lib/admin/fechas'
import { mapCierre, mapResumen } from '@/lib/caja/resumen'
import { formatoGs, formatoBrl } from '@/lib/pos/formato'
import { FiltroFechas } from '@/components/admin/FiltroFechas'
import { TablaResumenCaja } from '@/components/caja/TablaResumenCaja'
import { DialogoCierreForzado } from '@/components/admin/DialogoCierreForzado'
import { DialogoCorregirConteo } from '@/components/admin/DialogoCorregirConteo'

function diferencia(n: number | null, formato: (n: number) => string) { return n === null ? '—' : n < 0 ? `Falta ${formato(-n)}` : n > 0 ? `Sobra ${formato(n)}` : formato(0) }
export default async function Page({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
  await requerirAcceso('admin')
  const rango = rangoDeParams(await searchParams, 7); const db = await crearClienteServidor()
  const [cierres, actual] = await Promise.all([db.rpc('reporte_cierres', { p_desde: rango.desde, p_hasta: rango.hasta }), db.rpc('turno_actual')])
  if (cierres.error || actual.error) return <main className="p-6"><h1 className="font-heading text-2xl">Turnos</h1><p role="alert">No se pudieron cargar los turnos. Probá de nuevo.</p></main>
  const turno = actual.data?.[0]; const resumenActual = turno ? await db.rpc('resumen_turno', { p_turno_id: turno.id }) : null
  const filas = (cierres.data ?? []).map(mapCierre).filter(c => c.cerradoAt !== null)
  const ids = filas.map(c => c.turnoId)
  const correcciones = ids.length ? await db.from('correcciones_conteo').select('id,turno_id,created_at,motivo,contado_gs_anterior,contado_gs_nuevo,contado_brl_anterior,contado_brl_nuevo,perfiles(nombre)').in('turno_id', ids).order('created_at', { ascending: false }) : null
  const dias = [...new Set(filas.map(c => c.fecha))]
  const cantidad = (n: number | null, fmt: (n: number) => string) => n === null ? '—' : fmt(Number(n))
  return <main className="space-y-6 p-4 sm:p-6"><h1 className="font-heading text-2xl font-semibold">Turnos</h1>
    {turno && <section className="space-y-3"><h2 className="font-heading text-xl">Turno abierto · {turno.empleado_nombre}</h2><p>Abierto: {formatoFechaHora(turno.abierto_at)}</p>{resumenActual?.error || !resumenActual?.data ? <p role="alert">No se pudo cargar el resumen.</p> : <p>Esperado hasta ahora: {formatoGs(mapResumen(resumenActual.data).esperadoGs)} · {formatoBrl(mapResumen(resumenActual.data).esperadoBrl)}</p>}<DialogoCierreForzado turnoId={turno.id} /></section>}
    <FiltroFechas {...rango} /><h2 className="font-heading text-xl">Cierre diario</h2>{dias.length === 0 && <p>No hay cierres en este rango.</p>}
    {dias.map(dia => { const turnos = filas.filter(c => c.fecha === dia); return <section key={dia} className="space-y-4"><h3 className="font-heading text-lg">{dia}</h3>{turnos.map(c => <article key={c.turnoId} className="space-y-2 rounded-md border p-4"><h4 className="font-semibold">{c.empleadoNombre} · {formatoFechaHora(c.abiertoAt)} – {c.cerradoAt && formatoFechaHora(c.cerradoAt)}</h4><p>Esperado: {formatoGs(c.esperadoGs)} · {formatoBrl(c.esperadoBrl)}</p><p>Contado: {cantidad(c.contadoGs, formatoGs)} · {cantidad(c.contadoBrl, formatoBrl)}</p><p>Diferencia: <span className={c.diferenciaGs ? 'text-destructive-texto' : ''}>{diferencia(c.diferenciaGs, formatoGs)}</span> · <span className={c.diferenciaBrl ? 'text-destructive-texto' : ''}>{diferencia(c.diferenciaBrl, formatoBrl)}</span></p>{((c.contadoAnteriorGs !== null && c.fondoGs !== c.contadoAnteriorGs) || (c.contadoAnteriorBrl !== null && c.fondoBrl !== c.contadoAnteriorBrl)) && <p>Fondo distinto del cierre anterior</p>}{c.corregido && <p>Corregido</p>}{c.cerradoPorNombre && c.cerradoPorNombre !== c.empleadoNombre && <p>Cerrado por {c.cerradoPorNombre}</p>}
      <details><summary className="min-h-11 cursor-pointer py-2">Detalle del turno</summary>{c.contadoGs !== null && c.contadoBrl !== null && c.diferenciaGs !== null && c.diferenciaBrl !== null && <><TablaResumenCaja resumen={{ ...c, contadoGs: c.contadoGs, contadoBrl: c.contadoBrl, diferenciaGs: c.diferenciaGs, diferenciaBrl: c.diferenciaBrl }} /><DialogoCorregirConteo turnoId={c.turnoId} contadoGs={c.contadoGs} contadoBrl={c.contadoBrl} /></>}<h5 className="font-semibold">Correcciones</h5>{correcciones?.error ? <p role="alert">No se pudieron cargar las correcciones.</p> : !(correcciones?.data ?? []).some(x => x.turno_id === c.turnoId) ? <p>Sin correcciones.</p> : <ul>{correcciones?.data.filter(x => x.turno_id === c.turnoId).map(x => <li key={x.id} className="py-2">{x.perfiles?.nombre ?? '—'} · {formatoFechaHora(x.created_at)} · {cantidad(x.contado_gs_anterior, formatoGs)} → {cantidad(x.contado_gs_nuevo, formatoGs)} · {cantidad(x.contado_brl_anterior, formatoBrl)} → {cantidad(x.contado_brl_nuevo, formatoBrl)} · {x.motivo}</li>)}</ul>}</details></article>)}<p className="font-semibold">Total del día · Esperado: {formatoGs(turnos.reduce((s,c) => s+c.esperadoGs,0))} · {formatoBrl(turnos.reduce((s,c) => s+c.esperadoBrl,0))} · Contado: {formatoGs(turnos.reduce((s,c) => s+(c.contadoGs ?? 0),0))} · {formatoBrl(turnos.reduce((s,c) => s+(c.contadoBrl ?? 0),0))} · Diferencia: {diferencia(turnos.reduce((s,c) => s+(c.diferenciaGs ?? 0),0), formatoGs)} · {diferencia(turnos.reduce((s,c) => s+(c.diferenciaBrl ?? 0),0), formatoBrl)}</p></section> })}
  </main>
}

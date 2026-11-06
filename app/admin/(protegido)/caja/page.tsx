import { requerirAcceso } from '@/lib/auth/sesion'
import { crearClienteServidor } from '@/lib/supabase/server'
import { rangoDeParams, formatoFechaHora } from '@/lib/admin/fechas'
import { formatoGs, formatoBrl } from '@/lib/pos/formato'
import { FiltroFechas } from '@/components/admin/FiltroFechas'
import { MovimientoCaja } from '@/components/admin/MovimientoCaja'
export default async function Page({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string; sentido?: string }> }) {
  await requerirAcceso('admin'); const params = await searchParams; const rango = rangoDeParams(params, 7); const db = await crearClienteServidor()
  const [movimientos, turno] = await Promise.all([db.rpc('reporte_movimientos_caja', { p_desde: rango.desde, p_hasta: rango.hasta }), db.rpc('turno_actual')])
  const sentido = params.sentido === 'entrada' || params.sentido === 'salida' ? params.sentido : 'todos'
  return <main className="space-y-6 p-4 sm:p-6"><h1 className="font-heading text-2xl font-semibold">Caja</h1>{turno.error ? <p role="alert">No se pudo consultar el turno abierto.</p> : <MovimientoCaja hayTurno={!!turno.data?.length} />}<FiltroFechas {...rango} /><nav className="flex flex-wrap gap-4" aria-label="Filtrar movimientos">{[['todos', 'Todos'], ['entrada', 'Entradas'], ['salida', 'Salidas']].map(([valor, texto]) => <a key={valor} className="min-h-11 py-2 underline" aria-current={sentido === valor ? 'page' : undefined} href={`?desde=${rango.desde}&hasta=${rango.hasta}&sentido=${valor}`}>{texto}</a>)}</nav>{movimientos.error ? <p role="alert">No se pudieron cargar los movimientos.</p> : <ul className="divide-y">{movimientos.data?.filter(m => sentido === 'todos' || m.sentido === sentido).map(m => <li key={m.id} className="py-3">{formatoFechaHora(m.created_at)} · {m.sentido === 'entrada' ? 'Entrada' : 'Salida'} · {m.tipo.replaceAll('_', ' ')} · {m.moneda === 'PYG' ? formatoGs(Number(m.monto)) : formatoBrl(Number(m.monto))} · {m.motivo} · {m.usuario_nombre}</li>)}{!movimientos.data?.some(m => sentido === 'todos' || m.sentido === sentido) && <li>No hay movimientos en este rango.</li>}</ul>}</main>
}

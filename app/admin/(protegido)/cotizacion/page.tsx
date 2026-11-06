import { requerirAcceso } from '@/lib/auth/sesion'
import { crearClienteServidor } from '@/lib/supabase/server'
import { formatoFechaHora, hoyPy } from '@/lib/admin/fechas'
import { formatoTasa } from '@/lib/pos/formato'
import { FormCotizacion } from '@/components/admin/FormCotizacion'

export default async function Page() {
  await requerirAcceso('admin')
  const hoy = hoyPy()
  const desde = new Date(Date.parse(`${hoy}T00:00:00Z`) - 13 * 86_400_000).toISOString().slice(0, 10)
  const db = await crearClienteServidor()
  const { data, error } = await db.from('cotizaciones').select('fecha,valor_api,valor_manual,fuente,actualizado_por,updated_at,perfiles(nombre)').gte('fecha', desde).lte('fecha', hoy).order('fecha', { ascending: false })
  if (error) return <main className="p-6"><h1 className="font-heading text-2xl">Cotización del real</h1><p role="alert">No se pudo cargar la cotización. Probá de nuevo.</p></main>
  const actual = data.find(c => c.fecha === hoy)
  const vigente = actual?.valor_manual ?? actual?.valor_api
  return <main className="space-y-6 p-4 sm:p-6">
    <h1 className="font-heading text-2xl font-semibold">Cotización del real</h1>
    <section className="space-y-2"><h2 className="font-heading text-xl">Cotización de hoy</h2>
      {vigente != null ? <p>Vigente: <strong>{formatoTasa(vigente)} por R$ 1</strong></p> : <p className="text-aviso-texto">Sin cotización: Efectivo R$ bloqueado en el POS</p>}
      <p>API: {actual?.valor_api != null ? `${formatoTasa(actual.valor_api)} · ${actual.fuente ?? 'Fuente desconocida'}` : 'Sin cotización'}</p>
      <p>Manual: {actual?.valor_manual != null ? `${formatoTasa(actual.valor_manual)} · ${actual.perfiles?.nombre ?? 'Usuario desconocido'}` : 'Sin cotización'}</p>
      {actual && <p>Última actualización del registro: {formatoFechaHora(actual.updated_at)}</p>}
    </section>
    <FormCotizacion />
    <section><h2 className="font-heading text-xl">Historial de 14 días</h2>
      {data.length === 0 ? <p>No hay cotizaciones.</p> : <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr><th>Fecha</th><th>API</th><th>Manual</th><th>Vigente</th></tr></thead><tbody>{data.map(c => <tr key={c.fecha} className="border-t"><td className="py-2 pr-4">{c.fecha}</td><td className="pr-4">{c.valor_api != null ? formatoTasa(c.valor_api) : '—'}</td><td className="pr-4">{c.valor_manual != null ? formatoTasa(c.valor_manual) : '—'}</td><td>{c.valor_manual != null || c.valor_api != null ? formatoTasa((c.valor_manual ?? c.valor_api)!) : '—'}</td></tr>)}</tbody></table></div>}
    </section>
  </main>
}

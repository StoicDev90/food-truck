import { requerirAcceso } from '@/lib/auth/sesion'
import { crearClienteServidor } from '@/lib/supabase/server'
import { rangoDeParams, formatoFechaHora } from '@/lib/admin/fechas'
import { mensajeErrorReporte } from '@/lib/admin/reportes'
import { formatoGs } from '@/lib/pos/formato'
import { FiltroFechas } from '@/components/admin/FiltroFechas'

const medios = { efectivo_gs: 'Efectivo ₲', efectivo_brl: 'Efectivo R$', transferencia: 'Transferencia', tarjeta: 'Tarjeta' }
export default async function Page({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
  await requerirAcceso('admin')
  const rango = rangoDeParams(await searchParams, 7)
  const db = await crearClienteServidor()
  const { data, error } = await db.rpc('reporte_anulaciones', { p_desde: rango.desde, p_hasta: rango.hasta })
  return <main className="space-y-6 p-4 sm:p-6"><h1 className="font-heading text-2xl font-semibold">Anulaciones</h1><FiltroFechas {...rango} />
    {error ? <p role="alert">{mensajeErrorReporte(error)}</p> : !data?.length ? <p>No hay anulaciones en este rango.</p> : <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr><th>Fecha y hora de anulación</th><th>Total</th><th>Medio</th><th>Vendedor</th><th>Quién anuló</th><th>Motivo</th></tr></thead><tbody>{data.map(f => { const anuladaPor: string | null = f.anulada_por_nombre; return <tr className="border-t" key={f.venta_id}><td className="py-3 pr-4">{formatoFechaHora(f.anulada_at)}</td><td className="pr-4">{formatoGs(Number(f.total_gs))}</td><td className="pr-4">{medios[f.medio]}</td><td className="pr-4">{f.empleado_nombre}</td><td className="pr-4">{anuladaPor === null ? '—' : anuladaPor}</td><td>{f.motivo}</td></tr> })}</tbody></table></div>}
  </main>
}

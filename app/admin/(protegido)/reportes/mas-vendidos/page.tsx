import { requerirAcceso } from '@/lib/auth/sesion'
import { crearClienteServidor } from '@/lib/supabase/server'
import { rangoDeParams } from '@/lib/admin/fechas'
import { mensajeErrorReporte } from '@/lib/admin/reportes'
import { formatoGs } from '@/lib/pos/formato'
import { FiltroFechas } from '@/components/admin/FiltroFechas'

export default async function Page({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
  await requerirAcceso('admin')
  const rango = rangoDeParams(await searchParams, 7)
  const db = await crearClienteServidor()
  const { data, error } = await db.rpc('reporte_mas_vendidos', { p_desde: rango.desde, p_hasta: rango.hasta })
  return <main className="space-y-6 p-4 sm:p-6"><h1 className="font-heading text-2xl font-semibold">Más vendidos</h1><FiltroFechas {...rango} />
    {error ? <p role="alert">{mensajeErrorReporte(error)}</p> : !data?.length ? <p>No hay productos vendidos en este rango.</p> : <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr><th>Producto</th><th>Cantidad</th><th>Total</th><th>Ganancia</th></tr></thead><tbody>{data.map(f => { const ganancia: number | null = f.ganancia_gs; return <tr className="border-t" key={f.producto_id}><td className="py-3 pr-4">{f.nombre}</td><td className="pr-4">{Number(f.cantidad)}</td><td className="pr-4">{formatoGs(Number(f.total_gs))}</td><td>{ganancia === null ? 'Sin costo' : <>{formatoGs(Number(ganancia))}{Number(f.unidades_sin_costo) > 0 && ' (parcial)'}</>}</td></tr> })}</tbody></table></div>}
  </main>
}

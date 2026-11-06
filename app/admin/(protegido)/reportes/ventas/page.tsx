import { requerirAcceso } from '@/lib/auth/sesion'
import { crearClienteServidor } from '@/lib/supabase/server'
import { rangoDeParams } from '@/lib/admin/fechas'
import { mapFilaVentas, mensajeErrorReporte, resumenVentas, ventasPorDia, ventasPorEmpleado } from '@/lib/admin/reportes'
import { formatoGs, formatoBrl } from '@/lib/pos/formato'
import { FiltroFechas } from '@/components/admin/FiltroFechas'

export default async function Page({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
  await requerirAcceso('admin')
  const rango = rangoDeParams(await searchParams, 7)
  const db = await crearClienteServidor()
  const { data, error } = await db.rpc('reporte_ventas', { p_desde: rango.desde, p_hasta: rango.hasta })
  const filas = (data ?? []).map(mapFilaVentas)
  const total = resumenVentas(filas)
  return <main className="space-y-6 p-4 sm:p-6"><h1 className="font-heading text-2xl font-semibold">Ventas</h1><FiltroFechas {...rango} />
    {error ? <p role="alert">{mensajeErrorReporte(error)}</p> : <>
      <section className="space-y-2"><h2 className="font-heading text-xl">Totales del rango</h2><p>Ventas: {total.ventas} · Anuladas: {total.anuladas} · Total: {formatoGs(total.totalGs)}</p><p>Efectivo ₲: {formatoGs(total.efectivoGs)} · Efectivo R$: {formatoBrl(total.efectivoBrl)} ≈ {formatoGs(total.efectivoBrlEquivGs)} · Transferencias: {formatoGs(total.transferenciasGs)} · Tarjetas: {formatoGs(total.tarjetasGs)}</p></section>
      <section className="space-y-2"><h2 className="font-heading text-xl">Por día</h2>{filas.length === 0 ? <p>No hay ventas en este rango.</p> : <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr><th>Fecha</th><th>Efectivo ₲</th><th>Efectivo R$</th><th>Transferencias</th><th>Tarjetas</th><th>Total</th><th>Anuladas</th></tr></thead><tbody>{ventasPorDia(filas).map(({ fecha, resumen: r }) => <tr className="border-t" key={fecha}><td className="py-3 pr-4">{fecha}</td><td className="pr-4">{formatoGs(r.efectivoGs)}</td><td className="pr-4">{formatoBrl(r.efectivoBrl)} ≈ {formatoGs(r.efectivoBrlEquivGs)}</td><td className="pr-4">{formatoGs(r.transferenciasGs)}</td><td className="pr-4">{formatoGs(r.tarjetasGs)}</td><td className="pr-4">{formatoGs(r.totalGs)}</td><td>{r.anuladas}</td></tr>)}</tbody></table></div>}</section>
      <section className="space-y-2"><h2 className="font-heading text-xl">Por empleado</h2>{filas.length === 0 ? <p>No hay ventas en este rango.</p> : <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr><th>Empleado</th><th>Ventas</th><th>Total</th></tr></thead><tbody>{ventasPorEmpleado(filas).map(e => <tr className="border-t" key={e.empleadoId}><td className="py-3 pr-4">{e.nombre}</td><td className="pr-4">{e.ventas}</td><td>{formatoGs(e.totalGs)}</td></tr>)}</tbody></table></div>}</section>
    </>}
  </main>
}

import { requerirAcceso } from '@/lib/auth/sesion'
import { crearClienteServidor } from '@/lib/supabase/server'
import { formatoFechaHora, hoyPy, rangoDeParams } from '@/lib/admin/fechas'
import { mapFilaVentas, mensajeErrorReporte, resumenVentas } from '@/lib/admin/reportes'
import { mapCierre } from '@/lib/caja/resumen'
import { alertasHoy } from '@/lib/admin/hoy'
import { formatoGs } from '@/lib/pos/formato'
import { TarjetasHoy } from '@/components/admin/TarjetasHoy'
import { AtencionHoy } from '@/components/admin/AtencionHoy'
import { BotonTema } from '@/components/tema/BotonTema'

export default async function Page() {
  await requerirAcceso('admin')
  const hoy = hoyPy(), rango = rangoDeParams({}, 7)
  const db = await crearClienteServidor()
  const [ventas, vendidos, cierres, actual, cotizacion, productos] = await Promise.all([
    db.rpc('reporte_ventas', { p_desde: hoy, p_hasta: hoy }),
    db.rpc('reporte_mas_vendidos', { p_desde: hoy, p_hasta: hoy }),
    db.rpc('reporte_cierres', { p_desde: rango.desde, p_hasta: hoy }),
    db.rpc('turno_actual'),
    db.from('cotizaciones').select('fecha,valor_api,valor_manual,fuente').eq('fecha', hoy).maybeSingle(),
    db.from('productos').select('id,nombre,stock,controla_stock,activo'),
  ])
  const fecha = new Intl.DateTimeFormat('es-PY', { timeZone: 'America/Asuncion', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${hoy}T12:00:00Z`))
  const error = ventas.error || vendidos.error || cierres.error || actual.error || cotizacion.error || productos.error
  if (error) return <main className="space-y-4 p-4 sm:p-6"><h1 className="font-heading text-2xl">Hoy · {fecha}</h1><p role="alert">{mensajeErrorReporte(error)}</p></main>
  const resumen = resumenVentas((ventas.data ?? []).map(mapFilaVentas))
  const cierre = (cierres.data ?? []).map(mapCierre).find(c => c.cerradoAt !== null)
  const alertas = alertasHoy({ productos: (productos.data ?? []).map(p => ({ id: p.id, nombre: p.nombre, stock: Number(p.stock), controlaStock: p.controla_stock, activo: p.activo })), ultimoCierre: cierre ? { empleadoNombre: cierre.empleadoNombre, fecha: cierre.fecha, diferenciaGs: cierre.diferenciaGs ?? 0, diferenciaBrl: cierre.diferenciaBrl ?? 0 } : null, anuladasHoy: resumen.anuladas })
  const turno = actual.data?.[0]
  const tasa = cotizacion.data?.valor_manual ?? cotizacion.data?.valor_api
  return <main className="space-y-6 p-4 sm:p-6"><h1 className="font-heading text-2xl font-semibold">Hoy · {fecha}</h1>
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border bg-card p-4"><p>{turno ? `Turno abierto: ${turno.empleado_nombre} desde ${formatoFechaHora(turno.abierto_at).slice(-5)}` : 'Sin turno abierto'}</p><p>{tasa != null ? `Cotización: ${formatoGs(Number(tasa))} ${cotizacion.data?.valor_manual != null ? '(manual)' : '(API)'}` : 'Sin cotización'}</p><BotonTema className="ml-auto" /></div>
    <TarjetasHoy resumen={resumen} />
    <div className="grid items-start gap-4 lg:grid-cols-2"><section className="rounded-xl border bg-card p-5"><h2 className="font-heading text-xl">Más vendidos de hoy</h2>{!vendidos.data?.length ? <p className="mt-4">No hay productos vendidos hoy.</p> : <ol className="mt-2 divide-y">{vendidos.data.slice(0, 5).map(p => { const ganancia: number | null = p.ganancia_gs; return <li key={p.producto_id} className="flex justify-between gap-4 py-3"><span>{p.nombre} · {Number(p.cantidad)}</span><span>{ganancia === null ? 'sin costo' : <>{formatoGs(Number(ganancia))}{Number(p.unidades_sin_costo) > 0 && ' (parcial)'}</>}</span></li> })}</ol>}</section><AtencionHoy alertas={alertas} /></div>
  </main>
}

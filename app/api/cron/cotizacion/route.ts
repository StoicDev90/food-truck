import { obtenerCotizacionBcp } from '@/lib/cotizacion/bcp'
import { hoyPy } from '@/lib/admin/fechas'
import { crearClienteAdmin } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET
  if (!secreto || request.headers.get('authorization') !== `Bearer ${secreto}`) return new Response(null, { status: 401 })
  const cotizacion = await obtenerCotizacionBcp()
  if (!cotizacion) return new Response(null, { status: 502 })
  const fecha = hoyPy()
  const db = crearClienteAdmin()
  const { error } = await db.rpc('registrar_cotizacion_api', { p_fecha: fecha, p_valor: cotizacion.valor, p_fuente: `BCP ${cotizacion.fechaPublicacion} (AllRatesToday)` })
  if (error) return new Response(null, { status: 500 })
  return Response.json({ fecha, ...cotizacion })
}

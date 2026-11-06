import type { Database } from '@/types/supabase'

export type ResumenCaja = {
  fondoGs: number
  fondoBrl: number
  ventasEfectivoGs: number
  ventasEfectivoBrl: number
  entradasGs: number
  entradasBrl: number
  salidasGs: number
  salidasBrl: number
  esperadoGs: number
  esperadoBrl: number
  contadoGs: number
  contadoBrl: number
  diferenciaGs: number
  diferenciaBrl: number
  transferenciasGs: number
  tarjetasGs: number
}
export function mapResumen(r: Database['public']['CompositeTypes']['resumen_caja']): ResumenCaja {
  return {
    fondoGs: Number(r.fondo_gs),
    fondoBrl: Number(r.fondo_brl),
    ventasEfectivoGs: Number(r.ventas_efectivo_gs),
    ventasEfectivoBrl: Number(r.ventas_efectivo_brl),
    entradasGs: Number(r.entradas_gs),
    entradasBrl: Number(r.entradas_brl),
    salidasGs: Number(r.salidas_gs),
    salidasBrl: Number(r.salidas_brl),
    esperadoGs: Number(r.esperado_gs),
    esperadoBrl: Number(r.esperado_brl),
    contadoGs: Number(r.contado_gs),
    contadoBrl: Number(r.contado_brl),
    diferenciaGs: Number(r.diferencia_gs),
    diferenciaBrl: Number(r.diferencia_brl),
    transferenciasGs: Number(r.transferencias_gs),
    tarjetasGs: Number(r.tarjetas_gs),
  }
}


type CierreRow = Database['public']['Functions']['reporte_cierres']['Returns'][number]
export function mapCierre(r: CierreRow) {
  const nullable = (n: number | null) => n === null ? null : Number(n)
  return {
    turnoId: r.turno_id, fecha: r.fecha, empleadoNombre: r.empleado_nombre,
    abiertoAt: r.abierto_at, cerradoAt: r.cerrado_at as string | null,
    cerradoPorNombre: r.cerrado_por_nombre as string | null, corregido: r.corregido,
    contadoAnteriorGs: nullable(r.contado_anterior_gs), contadoAnteriorBrl: nullable(r.contado_anterior_brl),
    ...mapResumen(r),
    contadoGs: nullable(r.contado_gs), contadoBrl: nullable(r.contado_brl),
    diferenciaGs: nullable(r.diferencia_gs), diferenciaBrl: nullable(r.diferencia_brl),
  }
}

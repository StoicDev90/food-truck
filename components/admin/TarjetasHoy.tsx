import { formatoBrl, formatoGs } from '@/lib/pos/formato'
import type { resumenVentas } from '@/lib/admin/reportes'

export function TarjetasHoy({ resumen }: { resumen: ReturnType<typeof resumenVentas> }) {
  const tarjetas = [
    { titulo: 'Ventas de hoy', monto: formatoGs(resumen.totalGs), detalle: `${resumen.ventas} ventas · ${resumen.anuladas} anuladas` },
    { titulo: 'Efectivo', monto: formatoGs(resumen.efectivoGs), detalle: `+ ${formatoBrl(resumen.efectivoBrl)} (≈ ${formatoGs(resumen.efectivoBrlEquivGs)})` },
    { titulo: 'Transferencias', monto: formatoGs(resumen.transferenciasGs), detalle: 'controlar con el banco' },
    { titulo: 'Tarjetas', monto: formatoGs(resumen.tarjetasGs), detalle: 'controlar con el posnet' },
  ]
  return <section aria-label="Resumen de hoy" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{tarjetas.map(t => <article key={t.titulo} className="rounded-xl border bg-card p-5 text-card-foreground"><h2 className="font-semibold">{t.titulo}</h2><p className="mt-3 font-heading text-2xl">{t.monto}</p><p className="mt-1 text-sm text-muted-foreground">{t.detalle}</p></article>)}</section>
}

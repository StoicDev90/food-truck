import Link from 'next/link'
import type { Alerta } from '@/lib/admin/hoy'

export function AtencionHoy({ alertas }: { alertas: Alerta[] }) {
  return <section className="rounded-xl border bg-card p-5 text-card-foreground"><h2 className="font-heading text-xl">Atención</h2>{alertas.length === 0 ? <p className="mt-4">Todo en orden</p> : <ul className="mt-2 divide-y">{alertas.map((a, i) => <li key={`${a.tipo}-${i}`} className="flex items-center justify-between gap-4 py-2"><span>{a.texto}</span><Link className="inline-flex min-h-11 items-center rounded-md px-3 font-semibold text-marca underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" href={a.href}>{a.tipo === 'sin_stock' || a.tipo === 'stock_bajo' ? 'Ingresar' : 'Ver'}</Link></li>)}</ul>}</section>
}

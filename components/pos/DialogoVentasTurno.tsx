'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { anularVenta, ventasDelTurno } from '@/lib/pos/acciones'
import { formatoGs } from '@/lib/pos/formato'
type Venta = Extract<Awaited<ReturnType<typeof ventasDelTurno>>, { ok: true }>['data'][number]
const medios = { efectivo_gs: 'Efectivo ₲', efectivo_brl: 'Efectivo R$', transferencia: 'Transferencia', tarjeta: 'Tarjeta' }
export function DialogoVentasTurno() {
  const router = useRouter()
  const [ventas, setVentas] = useState<Venta[] | null>(null)
  const [seleccion, setSeleccion] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const [pendiente, setPendiente] = useState(false)
  useEffect(() => { let activo = true; void ventasDelTurno().then(r => { if (!activo) return; if (r.ok) setVentas(r.data); else setError(r.error) }); return () => { activo = false } }, [])
  async function confirmar(e: React.FormEvent) {
    e.preventDefault()
    if (!seleccion || !motivo.trim()) return
    setPendiente(true)
    const r = await anularVenta(seleccion, motivo.trim())
    setPendiente(false)
    if (!r.ok) { setError(r.error); return }
    setVentas(v => v?.map(x => x.id === seleccion ? { ...x, estado: 'anulada' } : x) ?? null)
    setSeleccion(null); setMotivo(''); setError(''); router.refresh()
  }
  return <div className="space-y-4">
    {error && <p role="alert" className="text-destructive-texto">{error}</p>}
    {ventas === null ? !error && <p>Cargando ventas…</p> : ventas.length === 0 ? <p>No hay ventas en este turno.</p> : <ul className="space-y-2">{ventas.map(v => <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2"><span>{new Intl.DateTimeFormat('es-PY', { timeZone: 'America/Asuncion', hour: '2-digit', minute: '2-digit' }).format(new Date(v.createdAt))} · {formatoGs(v.totalGs)} · {medios[v.medio]} · {v.empleadoNombre}</span>{v.estado === 'anulada' ? <strong>Anulada</strong> : <button type="button" className="min-h-11 rounded-md border px-3" onClick={() => { setSeleccion(v.id); setMotivo(''); setError('') }}>Anular</button>}</li>)}</ul>}
    {seleccion && <form onSubmit={confirmar} className="space-y-3 rounded-md border p-3"><label className="block">Motivo<input className="mt-1 min-h-11 w-full rounded-md border bg-background px-3" value={motivo} onChange={e => setMotivo(e.target.value)} /></label><div className="flex gap-2"><button type="button" className="min-h-11 rounded-md border px-3" onClick={() => setSeleccion(null)}>Cancelar</button><button disabled={!motivo.trim() || pendiente} className="min-h-11 rounded-md bg-primary px-3 text-primary-foreground disabled:opacity-50">Confirmar anulación</button></div></form>}
  </div>
}

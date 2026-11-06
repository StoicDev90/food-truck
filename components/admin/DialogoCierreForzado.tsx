'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cerrarTurnoForzado } from '@/lib/admin/turnos'
import { useEnvio } from '@/lib/admin/useEnvio'
import { parseMontoGs, parseMontoBrl } from '@/lib/pos/formato'
import { TablaResumenCaja } from '@/components/caja/TablaResumenCaja'
import type { ResumenCaja } from '@/lib/caja/resumen'

export function DialogoCierreForzado({ turnoId }: { turnoId: string }) {
  const router = useRouter(); const [abierto, setAbierto] = useState(false); const [gs, setGs] = useState('0'); const [brl, setBrl] = useState('0'); const [error, setError] = useState(''); const [resumen, setResumen] = useState<ResumenCaja | null>(null); const { enviar, enviando } = useEnvio()
  async function confirmar(e: React.FormEvent) { e.preventDefault(); const g = parseMontoGs(gs), b = parseMontoBrl(brl); if (g === null || b === null) { setError('Ingresá montos válidos.'); return }; await enviar(async () => { const r = await cerrarTurnoForzado(turnoId, g, b); if (r.ok) { setResumen(r.data) } else setError(r.error) }) }
  if (!abierto) return <button className="min-h-11 rounded-md bg-primary px-4 text-primary-foreground" onClick={() => setAbierto(true)}>Cerrar turno (forzado)</button>
  return <section className="space-y-4"><h3 className="font-heading text-xl">Cierre forzado</h3>{resumen ? <><TablaResumenCaja resumen={resumen} /><button type="button" className="min-h-11 px-4" onClick={() => router.refresh()}>Listo</button></> : <form onSubmit={confirmar} className="space-y-3"><label className="block">Contado ₲<input className="block min-h-11 w-full rounded-md border bg-background px-3" value={gs} onChange={e => setGs(e.target.value)} inputMode="numeric" /></label><label className="block">Contado R$<input className="block min-h-11 w-full rounded-md border bg-background px-3" value={brl} onChange={e => setBrl(e.target.value)} inputMode="decimal" /></label>{error && <p role="alert" className="text-destructive-texto">{error}</p>}<button className="min-h-11 rounded-md bg-primary px-4 text-primary-foreground" disabled={enviando}>{enviando ? 'Guardando…' : 'Confirmar conteo'}</button><button type="button" className="min-h-11 px-4" disabled={enviando} onClick={() => setAbierto(false)}>Cancelar</button></form>}</section>
}

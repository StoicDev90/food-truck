'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { corregirConteo } from '@/lib/admin/turnos'
import { useEnvio } from '@/lib/admin/useEnvio'
import { parseMontoGs, parseMontoBrl } from '@/lib/pos/formato'
import { MENSAJES_ERROR } from '@/lib/errores'
export function DialogoCorregirConteo({ turnoId, contadoGs, contadoBrl }: { turnoId: string; contadoGs: number; contadoBrl: number }) {
  const router = useRouter(); const [abierto, setAbierto] = useState(false); const [gs, setGs] = useState(String(contadoGs)); const [brl, setBrl] = useState(String(contadoBrl).replace('.', ',')); const [motivo, setMotivo] = useState(''); const [error, setError] = useState(''); const { enviar, enviando } = useEnvio()
  async function confirmar(e: React.FormEvent) { e.preventDefault(); if (!motivo.trim()) { setError(MENSAJES_ERROR.MOTIVO_REQUERIDO); return }; const g = parseMontoGs(gs), b = parseMontoBrl(brl); if (g === null || b === null) { setError('Ingresá montos válidos.'); return }; await enviar(async () => { const r = await corregirConteo(turnoId, g, b, motivo); if (r.ok) { setAbierto(false); router.refresh() } else setError(r.error) }) }
  if (!abierto) return <button className="min-h-11 underline" onClick={() => setAbierto(true)}>Corregir conteo</button>
  return <form onSubmit={confirmar} className="space-y-3"><label className="block">Contado ₲<input className="block min-h-11 w-full rounded-md border bg-background px-3" value={gs} onChange={e => setGs(e.target.value)} inputMode="numeric" /></label><label className="block">Contado R$<input className="block min-h-11 w-full rounded-md border bg-background px-3" value={brl} onChange={e => setBrl(e.target.value)} inputMode="decimal" /></label><label className="block">Motivo<input className="block min-h-11 w-full rounded-md border bg-background px-3" value={motivo} onChange={e => setMotivo(e.target.value)} /></label>{error && <p role="alert" className="text-destructive-texto">{error}</p>}<button disabled={enviando} className="min-h-11 rounded-md bg-primary px-4 text-primary-foreground">{enviando ? 'Guardando…' : 'Guardar corrección'}</button><button type="button" disabled={enviando} className="min-h-11 px-4" onClick={() => setAbierto(false)}>Cancelar</button></form>
}

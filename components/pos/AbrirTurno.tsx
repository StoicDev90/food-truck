'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { abrirTurno } from '@/lib/pos/acciones'
import { formatoBrl, formatoGs, parseMontoBrl, parseMontoGs } from '@/lib/pos/formato'

export function AbrirTurno({ nombre, fondoSugerido }: { nombre: string; fondoSugerido: { gs: number; brl: number } }) {
  const router = useRouter()
  const [gs, setGs] = useState(formatoGs(fondoSugerido.gs))
  const [brl, setBrl] = useState(formatoBrl(fondoSugerido.brl))
  const [error, setError] = useState('')
  const [pendiente, setPendiente] = useState(false)
  const cambio = parseMontoGs(gs) !== fondoSugerido.gs || parseMontoBrl(brl) !== fondoSugerido.brl
  async function abrir(e: React.FormEvent) {
    e.preventDefault()
    const g = parseMontoGs(gs), b = parseMontoBrl(brl)
    if (g === null || b === null) { setError('Ingresá montos válidos.'); return }
    setPendiente(true); setError('')
    try {
      const resultado = await abrirTurno(g, b)
      if (resultado.ok) router.refresh()
      else setError(resultado.error)
    } finally { setPendiente(false) }
  }
  return <section className="w-full max-w-md space-y-6">
    <h1 className="font-heading text-2xl">Hola, {nombre}</h1>
    <h2 className="font-heading text-xl">Abrir turno</h2>
    <form onSubmit={abrir} className="space-y-4">
      <label className="block space-y-1">Fondo inicial ₲<input className="block min-h-11 w-full rounded-md border border-input bg-background px-3 focus-visible:outline-2 focus-visible:outline-ring" inputMode="numeric" value={gs} onChange={e => setGs(e.target.value)} /></label>
      <label className="block space-y-1">Fondo inicial R$<input className="block min-h-11 w-full rounded-md border border-input bg-background px-3 focus-visible:outline-2 focus-visible:outline-ring" inputMode="decimal" value={brl} onChange={e => setBrl(e.target.value)} /></label>
      {cambio && <p className="rounded-md bg-aviso-fondo p-3 text-aviso">La diferencia con el cierre anterior queda registrada</p>}
      {error && <p role="alert" className="text-destructive-texto">{error}</p>}
      <button disabled={pendiente} className="min-h-11 w-full rounded-md bg-primary px-4 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">ABRIR TURNO</button>
    </form>
  </section>
}

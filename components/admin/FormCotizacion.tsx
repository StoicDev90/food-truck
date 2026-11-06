'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { fijarCotizacionManual } from '@/lib/admin/cotizacion'
import { useEnvio } from '@/lib/admin/useEnvio'
import { parseMontoBrl } from '@/lib/pos/formato'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function FormCotizacion() {
  const router = useRouter()
  const { enviar, enviando } = useEnvio()
  const [valor, setValor] = useState('')
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  function guardar(e: FormEvent) {
    e.preventDefault(); setError(''); setMensaje('')
    const monto = parseMontoBrl(valor)
    if (monto === null || monto <= 0) { setError('Ingresá una cotización válida mayor que cero.'); return }
    void enviar(async () => {
      const resultado = await fijarCotizacionManual(monto)
      if (!resultado.ok) { setError(resultado.error); return }
      setValor(''); setMensaje('Cotización manual guardada.'); router.refresh()
    })
  }
  return <form onSubmit={guardar} className="space-y-4 rounded-lg border p-4">
    <h2 className="font-heading text-xl">Fijar cotización manual de hoy</h2>
    <label className="block">Cotización<Input className="min-h-11" inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} required /></label>
    <Button type="submit" className="min-h-11" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar'}</Button>
    {error && <p role="alert" className="text-destructive-texto">{error}</p>}{mensaje && <p role="status">{mensaje}</p>}
  </form>
}

'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ingresarStock, ajustarStock } from '@/lib/admin/stock'
import { useEnvio } from '@/lib/admin/useEnvio'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function FormMovimientoStock({ productoId }: { productoId: string }) {
  const router = useRouter()
  const { enviar, enviando } = useEnvio()
  const [tipo, setTipo] = useState<'ingreso' | 'ajuste'>('ingreso')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  function guardar(e: FormEvent) {
    e.preventDefault(); setError(''); setMensaje('')
    if (!/^-?\d+$/.test(cantidad) || !Number.isSafeInteger(Number(cantidad))) { setError('Ingresá una cantidad entera.'); return }
    void enviar(async () => {
      const r = tipo === 'ingreso' ? await ingresarStock(productoId, Number(cantidad), motivo) : await ajustarStock(productoId, Number(cantidad), motivo)
      if (!r.ok) { setError(r.error); return }
      setCantidad(''); setMotivo(''); setMensaje(`Stock actualizado: ${r.data.stock}`); router.refresh()
    })
  }
  return <form onSubmit={guardar} className="space-y-4 rounded-lg border p-4">
    <h2 className="font-heading text-xl">Registrar movimiento</h2>
    <label className="block">Tipo<select className="block min-h-11 w-full rounded-md border bg-background px-3" value={tipo} onChange={e => setTipo(e.target.value as 'ingreso' | 'ajuste')}><option value="ingreso">Ingreso</option><option value="ajuste">Ajuste</option></select></label>
    <label className="block">Cantidad {tipo === 'ajuste' && '(positiva o negativa)'}<Input className="min-h-11" inputMode="numeric" value={cantidad} onChange={e => setCantidad(e.target.value)} required /></label>
    <label className="block">Motivo {tipo === 'ingreso' ? '(opcional)' : '(obligatorio)'}<Input className="min-h-11" value={motivo} onChange={e => setMotivo(e.target.value)} required={tipo === 'ajuste'} /></label>
    <Button className="min-h-11" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar'}</Button>
    {error && <p role="alert" className="text-destructive-texto">{error}</p>}{mensaje && <p role="status">{mensaje}</p>}
  </form>
}

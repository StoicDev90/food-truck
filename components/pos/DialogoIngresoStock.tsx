'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ingresarStock } from '@/lib/pos/acciones'
import type { ProductoPos } from '@/lib/pos/pedido'

export function DialogoIngresoStock({ productos, onCerrar }: { productos: ProductoPos[]; onCerrar: () => void }) {
  const router = useRouter()
  const [producto, setProducto] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const [pendiente, setPendiente] = useState(false)
  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    const n = Number(cantidad)
    if (!producto || !/^\d+$/.test(cantidad) || !Number.isSafeInteger(n) || n < 1) { setError('Elegí un producto y una cantidad válida.'); return }
    setPendiente(true)
    const resultado = await ingresarStock(producto, n, motivo.trim() || null)
    setPendiente(false)
    if (!resultado.ok) { setError(resultado.error); return }
    router.refresh(); onCerrar()
  }
  return <form onSubmit={enviar} className="space-y-4">
    <label className="block">Producto<select className="mt-1 min-h-11 w-full rounded-md border bg-background px-3" value={producto} onChange={e => setProducto(e.target.value)}><option value="">Elegí un producto</option>{productos.filter(p => p.controlaStock).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></label>
    <label className="block">Cantidad<input className="mt-1 min-h-11 w-full rounded-md border bg-background px-3" inputMode="numeric" value={cantidad} onChange={e => setCantidad(e.target.value)} /></label>
    <label className="block">Motivo (opcional)<input className="mt-1 min-h-11 w-full rounded-md border bg-background px-3" value={motivo} onChange={e => setMotivo(e.target.value)} /></label>
    {error && <p role="alert" className="text-destructive-texto">{error}</p>}
    <button disabled={pendiente} className="min-h-11 rounded-md bg-primary px-4 font-bold text-primary-foreground disabled:opacity-50">Ingresar stock</button>
  </form>
}

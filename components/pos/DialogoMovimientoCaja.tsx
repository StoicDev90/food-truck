'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registrarMovimientoCaja } from '@/lib/pos/acciones'
import { parseMontoBrl, parseMontoGs } from '@/lib/pos/formato'
type Sentido = 'salida' | 'entrada'
type Tipo = 'retiro' | 'pago_proveedor' | 'aporte_cambio' | 'otro'
export function DialogoMovimientoCaja({ onCerrar }: { onCerrar: () => void }) {
  const router = useRouter()
  const [sentido, setSentido] = useState<Sentido>('salida')
  const [tipo, setTipo] = useState<Tipo>('retiro')
  const [moneda, setMoneda] = useState<'PYG' | 'BRL'>('PYG')
  const [monto, setMonto] = useState('')
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const [pendiente, setPendiente] = useState(false)
  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    const valor = moneda === 'PYG' ? parseMontoGs(monto) : parseMontoBrl(monto)
    if (valor === null || valor <= 0 || !motivo.trim()) { setError('Ingresá un monto válido y un motivo.'); return }
    setPendiente(true)
    const resultado = await registrarMovimientoCaja({ sentido, tipo, moneda, monto: valor, motivo: motivo.trim() })
    setPendiente(false)
    if (!resultado.ok) { setError(resultado.error); return }
    router.refresh(); onCerrar()
  }
  const campo = 'mt-1 min-h-11 w-full rounded-md border bg-background px-3'
  return <form onSubmit={enviar} className="space-y-4">
    <label className="block">Sentido<select className={campo} value={sentido} onChange={e => { const s = e.target.value as Sentido; setSentido(s); setTipo(s === 'salida' ? 'retiro' : 'aporte_cambio') }}><option value="salida">Salida</option><option value="entrada">Entrada</option></select></label>
    <label className="block">Tipo<select className={campo} value={tipo} onChange={e => setTipo(e.target.value as Tipo)}>{sentido === 'salida' ? <><option value="retiro">Retiro de dueño</option><option value="pago_proveedor">Pago a proveedor</option><option value="otro">Otro egreso</option></> : <><option value="aporte_cambio">Aporte de cambio</option><option value="otro">Otro ingreso</option></>}</select></label>
    <label className="block">Moneda<select className={campo} value={moneda} onChange={e => setMoneda(e.target.value as 'PYG' | 'BRL')}><option value="PYG">₲</option><option value="BRL">R$</option></select></label>
    <label className="block">Monto<input className={campo} inputMode="decimal" value={monto} onChange={e => setMonto(e.target.value)} /></label>
    <label className="block">Motivo<input className={campo} value={motivo} onChange={e => setMotivo(e.target.value)} /></label>
    {error && <p role="alert" className="text-destructive-texto">{error}</p>}
    <button disabled={pendiente || !motivo.trim()} className="min-h-11 rounded-md bg-primary px-4 font-bold text-primary-foreground disabled:opacity-50">Registrar movimiento</button>
  </form>
}

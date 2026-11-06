'use client'

import { useEffect, useRef, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { registrarVenta } from '@/lib/pos/acciones'
import { montoExactoBrl, previewCobro, type MedioPago } from '@/lib/pos/cobro'
import { formatoBrl, formatoGs, parseMontoBrl, parseMontoGs } from '@/lib/pos/formato'
import { itemsParaVenta, totalGs, type Pedido } from '@/lib/pos/pedido'

type Venta = { ventaId: string; totalGs: number; vueltoGs: number }
type Props = {
  abierto: boolean
  pedido: Pedido
  cotizacion: number | null
  onCerrar: () => void
  onVendido: (resultado: Venta) => void
  onSinTurno: () => void
}

const medios: { id: MedioPago; nombre: string }[] = [
  { id: 'efectivo_gs', nombre: 'Efectivo ₲' },
  { id: 'efectivo_brl', nombre: 'Efectivo R$' },
  { id: 'transferencia', nombre: 'Transferencia' },
  { id: 'tarjeta', nombre: 'Tarjeta' },
]
const control = 'min-h-11 min-w-11 rounded-lg border px-3 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

export function DialogoCobro(props: Props) {
  return props.abierto ? <CobroAbierto {...props} /> : null
}

function CobroAbierto({ pedido, cotizacion, onCerrar, onVendido, onSinTurno }: Props) {
  const [clave] = useState(() => crypto.randomUUID())
  const [medio, setMedio] = useState<MedioPago>('efectivo_gs')
  const [monto, setMonto] = useState('')
  const [pendiente, setPendiente] = useState(false)
  const [error, setError] = useState('')
  const [venta, setVenta] = useState<Venta | null>(null)
  const botonConfirmar = useRef<HTMLButtonElement>(null)
  const bloqueado = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const total = totalGs(pedido)
  const efectivo = medio === 'efectivo_gs' || medio === 'efectivo_brl'
  const recibido = medio === 'efectivo_brl' ? parseMontoBrl(monto) : parseMontoGs(monto)
  const preview = previewCobro(total, medio, efectivo ? recibido : null, cotizacion)
  const disponibleBrl = cotizacion !== null && cotizacion > 0

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  function elegir(nuevo: MedioPago) {
    if (bloqueado.current || (nuevo === 'efectivo_brl' && !disponibleBrl)) return
    setMedio(nuevo); setMonto(''); setError('')
  }
  function cerrar() {
    if (!bloqueado.current) onCerrar()
  }
  async function confirmar() {
    if (bloqueado.current || !preview.alcanza) return
    bloqueado.current = true
    setPendiente(true); setError('')
    try {
      const resultado = await registrarVenta({
        clave, items: itemsParaVenta(pedido), medio, montoRecibido: efectivo ? recibido : null,
      })
      if (resultado.ok) {
        setVenta(resultado.data)
        timer.current = setTimeout(() => { onVendido(resultado.data); onCerrar() }, 2000)
        return
      }
      setError(resultado.error)
      if (resultado.codigo === 'SIN_TURNO_ABIERTO') onSinTurno()
    } catch {
      setError('No se pudo completar. Probá de nuevo.')
    }
    bloqueado.current = false
    setPendiente(false)
  }
  useEffect(() => {
    function teclado(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar(); return }
      const target = e.target as HTMLElement | null
      if (e.key === 'Enter') {
        if (target === botonConfirmar.current || target?.id === 'monto-cobro') {
          e.preventDefault()
          confirmar()
        }
        return
      }
      if (target instanceof Element && target.closest('input, textarea, select')) return
      const indice = ['1', '2', '3', '4'].indexOf(e.key)
      if (indice >= 0) { e.preventDefault(); elegir(medios[indice].id) }
    }
    document.addEventListener('keydown', teclado, true)
    return () => document.removeEventListener('keydown', teclado, true)
  })

  return (
    <Dialog open onOpenChange={open => { if (!open) cerrar() }}>
      <DialogContent showCloseButton={false} className="max-h-[90vh] overflow-y-auto text-base sm:max-w-xl">
        <DialogTitle className="text-2xl">Cobrar {formatoGs(total)}</DialogTitle>
        {venta ? (
          <div role="status" className="rounded-xl bg-exito-fondo p-5 text-exito">
            <p className="font-heading text-2xl">Venta registrada</p>
            <p className="font-heading text-3xl tabular-nums">Vuelto {formatoGs(venta.vueltoGs)}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {medios.map(opcion => (
                <button key={opcion.id} type="button" aria-pressed={medio === opcion.id}
                  disabled={pendiente || (opcion.id === 'efectivo_brl' && !disponibleBrl)}
                  onClick={() => elegir(opcion.id)}
                  className={`${control} ${medio === opcion.id ? 'bg-secondary text-secondary-foreground' : 'bg-card text-card-foreground'}`}>
                  {opcion.nombre}
                  {opcion.id === 'efectivo_brl' && !disponibleBrl && <span className="block text-sm">sin cotización</span>}
                </button>
              ))}
            </div>
            {efectivo ? (
              <div className="space-y-3">
                {medio === 'efectivo_brl' && cotizacion && <p>1 R$ = {formatoGs(cotizacion)}</p>}
                <label className="block font-bold" htmlFor="monto-cobro">Recibido</label>
                <input id="monto-cobro" inputMode="decimal" value={monto} disabled={pendiente}
                  onChange={e => setMonto(e.target.value)}
                  className="min-h-11 w-full rounded-lg border bg-background px-3 focus-visible:outline-2 focus-visible:outline-ring" />
                <div className="flex flex-wrap gap-2">
                  {(medio === 'efectivo_gs' ? [20000, 50000, 100000] : [20, 50, 100, 200]).map(n => (
                    <button key={n} type="button" disabled={pendiente} className={control}
                      onClick={() => setMonto(String(n))}>
                      {medio === 'efectivo_gs' ? formatoGs(n) : `R$ ${n}`}
                    </button>
                  ))}
                  <button type="button" disabled={pendiente} className={control} onClick={() => setMonto(
                    medio === 'efectivo_gs' ? String(total) : formatoBrl(montoExactoBrl(total, cotizacion!)).replace('R$ ', ''),
                  )}>Exacto</button>
                </div>
                {medio === 'efectivo_brl' && preview.equivalenteGs !== null && <p>= {formatoGs(preview.equivalenteGs)}</p>}
                {preview.vueltoGs !== null && <div className="rounded-xl bg-exito-fondo p-4 text-exito"><p>Vuelto</p><p className="font-heading text-3xl tabular-nums">{formatoGs(preview.vueltoGs)}</p></div>}
                {preview.equivalenteGs !== null && !preview.alcanza && <p className="text-destructive-texto">Falta {formatoGs(total - preview.equivalenteGs)}</p>}
              </div>
            ) : <p>¿Entró el pago de {formatoGs(total)}?</p>}
            {error && <p role="alert" className="text-destructive-texto">{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={cerrar} disabled={pendiente} className={`${control} flex-1`}>Cancelar</button>
              <button ref={botonConfirmar} type="button" onClick={confirmar} disabled={pendiente || !preview.alcanza}
                className={`${control} flex flex-1 items-center justify-center gap-2 bg-primary text-primary-foreground disabled:opacity-50`}>
                {pendiente ? <><LoaderCircle aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" />Registrando…</> : efectivo ? 'CONFIRMAR' : 'Sí, confirmar'}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

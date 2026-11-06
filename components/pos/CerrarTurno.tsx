'use client'

import { useEffect, useState } from 'react'
import { cerrarTurno, type ResumenCaja } from '@/lib/pos/acciones'
import { cerrarSesion } from '@/lib/auth/acciones'
import { formatoBrl, formatoGs, parseMontoBrl, parseMontoGs } from '@/lib/pos/formato'

export const TIEMPO_CIERRE_SESION_MS = 150_000
const numeroGs = (n: number) => formatoGs(n).replace('₲ ', '').replace('-', '−')
const numeroBrl = (n: number) => formatoBrl(n).replace('R$ ', '').replace('-', '−')

export function CerrarTurno({ turnoId, abierto, onCerrar }: { turnoId: string; abierto: string; onCerrar: () => void }) {
  const [gs, setGs] = useState('0')
  const [brl, setBrl] = useState('0')
  const [error, setError] = useState('')
  const [pendiente, setPendiente] = useState(false)
  const [resumen, setResumen] = useState<ResumenCaja | null>(null)
  useEffect(() => {
    if (!resumen) return
    let timer: ReturnType<typeof setTimeout>
    const reiniciar = () => {
      clearTimeout(timer)
      timer = setTimeout(() => { void cerrarSesion('pos') }, TIEMPO_CIERRE_SESION_MS)
    }
    reiniciar()
    window.addEventListener('pointerdown', reiniciar)
    window.addEventListener('keydown', reiniciar)
    return () => { clearTimeout(timer); window.removeEventListener('pointerdown', reiniciar); window.removeEventListener('keydown', reiniciar) }
  }, [resumen])
  async function confirmar(e: React.FormEvent) {
    e.preventDefault()
    const g = parseMontoGs(gs), b = parseMontoBrl(brl)
    if (g === null || b === null) { setError('Ingresá montos válidos.'); return }
    setPendiente(true); setError('')
    try {
      const resultado = await cerrarTurno(turnoId, g, b)
      if (resultado.ok) setResumen(resultado.data)
      else setError(resultado.error)
    } finally { setPendiente(false) }
  }
  const filas = resumen ? [
    ['Fondo inicial', resumen.fondoGs, resumen.fondoBrl],
    ['+ Ventas en efectivo', resumen.ventasEfectivoGs, resumen.ventasEfectivoBrl],
    ...(resumen.entradasGs || resumen.entradasBrl ? [['+ Entradas', resumen.entradasGs, resumen.entradasBrl] as const] : []),
    ['− Retiros y pagos', -resumen.salidasGs, -resumen.salidasBrl],
    ['= Esperado', resumen.esperadoGs, resumen.esperadoBrl],
    ['Contado', resumen.contadoGs, resumen.contadoBrl],
    ['Diferencia', resumen.diferenciaGs, resumen.diferenciaBrl],
  ] as const : []
  return <section className="w-full max-w-2xl space-y-5">
    <h2 className="font-heading text-2xl">Cerrar turno</h2>
    <p>Turno abierto: {abierto}</p>
    {!resumen ? <form onSubmit={confirmar} className="space-y-4">
      <label className="block space-y-1">Contado ₲<input className="block min-h-11 w-full rounded-md border border-input bg-background px-3 focus-visible:outline-2 focus-visible:outline-ring" inputMode="numeric" value={gs} onChange={e => setGs(e.target.value)} /></label>
      <label className="block space-y-1">Contado R$<input className="block min-h-11 w-full rounded-md border border-input bg-background px-3 focus-visible:outline-2 focus-visible:outline-ring" inputMode="decimal" value={brl} onChange={e => setBrl(e.target.value)} /></label>
      <p className="rounded-md bg-aviso-fondo p-3 text-aviso">Al confirmar, el conteo queda final. Solo un dueño puede corregirlo.</p>
      {error && <p role="alert" className="text-destructive-texto">{error}</p>}
      <div className="flex gap-3"><button type="button" onClick={onCerrar} disabled={pendiente} className="min-h-11 rounded-md border px-4 focus-visible:outline-2 focus-visible:outline-ring">Cancelar</button><button disabled={pendiente} className="min-h-11 rounded-md bg-primary px-4 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">Confirmar conteo</button></div>
    </form> : <>
      <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr><th scope="col">Concepto</th><th scope="col">₲</th><th scope="col">R$</th></tr></thead><tbody>{filas.map(([nombre, g, b]) => <tr key={nombre}><th scope="row" className="py-2 pr-3 font-normal">{nombre}</th><td className={nombre === 'Diferencia' ? g < 0 ? 'text-destructive-texto' : g === 0 ? 'text-exito' : '' : ''}>{numeroGs(g)}</td><td className={nombre === 'Diferencia' ? b < 0 ? 'text-destructive-texto' : b === 0 ? 'text-exito' : '' : ''}>{numeroBrl(b)}</td></tr>)}</tbody></table></div>
      <p>Transferencias {formatoGs(resumen.transferenciasGs)} · Tarjetas {formatoGs(resumen.tarjetasGs)}</p>
      <button onClick={() => void cerrarSesion('pos')} className="min-h-11 rounded-md bg-primary px-4 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-ring">Listo · cerrar sesión</button>
    </>}
  </section>
}

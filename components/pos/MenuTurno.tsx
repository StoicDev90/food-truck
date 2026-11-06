'use client'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import type { ProductoPos } from '@/lib/pos/pedido'
const CerrarTurno = lazy(() => import('./CerrarTurno').then(m => ({ default: m.CerrarTurno })))
import { DialogoIngresoStock } from './DialogoIngresoStock'
import { DialogoVentasTurno } from './DialogoVentasTurno'
import { DialogoMovimientoCaja } from './DialogoMovimientoCaja'
type Vista = 'Ingreso de stock' | 'Ventas del turno' | 'Movimiento de caja' | 'Cerrar turno'
export function MenuTurno({ rol, productos, turnoId, abierto }: { rol: 'dueno' | 'empleado'; productos: ProductoPos[]; turnoId: string; abierto: string }) {
  const [menu, setMenu] = useState(false)
  const [vista, setVista] = useState<Vista | null>(null)
  const contenedor = useRef<HTMLDivElement>(null)
  const boton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!menu) return
    function fuera(evento: Event) {
      if (!contenedor.current?.contains(evento.target as Node)) setMenu(false)
    }
    function teclado(evento: KeyboardEvent) {
      if (evento.key === 'Escape') { setMenu(false); boton.current?.focus() }
    }
    document.addEventListener('pointerdown', fuera)
    document.addEventListener('focusin', fuera)
    document.addEventListener('keydown', teclado)
    return () => {
      document.removeEventListener('pointerdown', fuera)
      document.removeEventListener('focusin', fuera)
      document.removeEventListener('keydown', teclado)
    }
  }, [menu])
  const opciones: Vista[] = ['Ingreso de stock', 'Ventas del turno', ...(rol === 'dueno' ? ['Movimiento de caja' as const] : []), 'Cerrar turno']
  return <>
    <div ref={contenedor}>
    <button ref={boton} type="button" aria-label="Menú del turno" aria-expanded={menu} onClick={() => setMenu(!menu)} className="size-11 rounded-full border border-sidebar-border text-2xl focus-visible:outline-2 focus-visible:outline-sidebar-ring">≡</button>
    {menu && <div className="absolute right-4 top-full z-30 min-w-56 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg">{opciones.map(opcion => <button key={opcion} type="button" className="block min-h-11 w-full rounded px-3 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring" onClick={() => { setMenu(false); setVista(opcion) }}>{opcion}</button>)}</div>}
    </div>
    <Dialog open={vista !== null} onOpenChange={abierto => { if (!abierto && vista !== 'Cerrar turno') setVista(null) }}>
      <DialogContent showCloseButton={false} className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogTitle className="text-xl">{vista}</DialogTitle>
        {vista === 'Ingreso de stock' && <DialogoIngresoStock productos={productos} onCerrar={() => setVista(null)} />}
        {vista === 'Ventas del turno' && <DialogoVentasTurno />}
        {vista === 'Movimiento de caja' && rol === 'dueno' && <DialogoMovimientoCaja onCerrar={() => setVista(null)} />}
        {vista === 'Cerrar turno' && <Suspense fallback={<p>Cargando…</p>}><CerrarTurno turnoId={turnoId} abierto={abierto} onCerrar={() => setVista(null)} /></Suspense>}
        {vista !== 'Cerrar turno' && <button type="button" className="min-h-11 justify-self-start rounded-md border px-4" onClick={() => setVista(null)}>Cerrar</button>}
      </DialogContent>
    </Dialog>
  </>
}

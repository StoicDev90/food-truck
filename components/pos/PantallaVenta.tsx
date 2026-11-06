'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DatosPos } from '@/lib/pos/datos'
import { agregar, quitar, totalGs, type Pedido } from '@/lib/pos/pedido'
import { formatoGs } from '@/lib/pos/formato'
import { useConexion } from '@/lib/pos/useConexion'
import { BarraPos } from './BarraPos'
import { GrillaProductos } from './GrillaProductos'
import { PanelPedido } from './PanelPedido'

export function PantallaVenta({ datos, onCobrar }: { datos: DatosPos; onCobrar?: (contexto: { pedido: Pedido; onSinTurno: () => void }) => void }) {
  const router = useRouter(); const conectado = useConexion()
  const [pedido, setPedido] = useState<Pedido>([]); const [categoria, setCategoria] = useState(''); const [filtro, setFiltro] = useState(''); const [expandido, setExpandido] = useState(false)
  useEffect(() => {
    function teclado(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target instanceof Element && target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])') || document.querySelector('[role="dialog"], dialog[open], [role="alertdialog"]') || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return
      if (e.key === 'Escape') setFiltro('')
      else if (e.key === 'Enter') { if (pedido.length && conectado) { e.preventDefault(); onCobrar?.({ pedido, onSinTurno: () => router.refresh() }) } }
      else if (e.key.length === 1) setFiltro(f => f + e.key)
    }
    document.addEventListener('keydown', teclado); return () => document.removeEventListener('keydown', teclado)
  }, [pedido, conectado, onCobrar, router])
  if (!datos.turno) return null
  const productos = datos.productos.filter(p => (!categoria || p.categoriaId === categoria) && p.nombre.toLocaleLowerCase('es').includes(filtro.toLocaleLowerCase('es')))
  const panel = <PanelPedido pedido={pedido} productos={datos.productos} cotizacion={datos.cotizacion} conectado={conectado} agregar={p => setPedido(actual => agregar(actual, p))} quitar={id => setPedido(actual => quitar(actual, id))} vaciar={() => setPedido([])} cobrar={() => onCobrar?.({ pedido, onSinTurno: () => router.refresh() })} />
  return <div className="flex min-h-screen flex-1 flex-col"><BarraPos turno={datos.turno} cotizacion={datos.cotizacion} conectado={conectado} />
    {!conectado && <div role="status" className="bg-destructive px-4 py-3 font-bold text-destructive-foreground">Sin conexión</div>}
    <div className="flex flex-1"><main className="min-w-0 flex-1 p-4 pb-24 md:pb-4"><nav aria-label="Categorías" className="mb-4 flex flex-wrap gap-2"><button type="button" onClick={() => setCategoria('')} aria-pressed={!categoria} className={`min-h-11 rounded-full px-4 font-bold ${!categoria ? 'bg-secondary text-secondary-foreground dark:bg-primary dark:text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>Todas</button>{datos.categorias.map(c => <button key={c.id} type="button" onClick={() => setCategoria(c.id)} aria-pressed={categoria === c.id} className={`min-h-11 rounded-full px-4 font-bold ${categoria === c.id ? 'bg-secondary text-secondary-foreground dark:bg-primary dark:text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{c.nombre}</button>)}</nav>
    {filtro && <p className="mb-3">Buscando: <strong>{filtro}</strong> <button type="button" onClick={() => setFiltro('')} className="min-h-11 px-2 text-marca">Limpiar</button></p>}<GrillaProductos productos={productos} pedido={pedido} agregar={p => setPedido(actual => agregar(actual, p))} /></main>
    <aside className="hidden w-72 shrink-0 border-l md:block lg:w-80">{panel}</aside></div>
    <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-card shadow-lg md:hidden">{expandido && <div className="max-h-[65vh] overflow-y-auto">{panel}</div>}<button type="button" aria-expanded={expandido} onClick={() => setExpandido(v => !v)} className="flex min-h-14 w-full items-center justify-between px-4 font-bold"><span>Pedido ({pedido.reduce((n, l) => n + l.cantidad, 0)}) {expandido ? '⌄' : '⌃'}</span><span className="tabular-nums">{formatoGs(totalGs(pedido))}</span></button></div>
  </div>
}

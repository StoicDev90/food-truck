import type { Pedido, ProductoPos } from '@/lib/pos/pedido'
import { totalGs } from '@/lib/pos/pedido'
import { formatoBrl, formatoGs } from '@/lib/pos/formato'
import { equivalenteBrl } from '@/lib/pos/cobro'

export function PanelPedido({ pedido, productos, cotizacion, conectado, agregar, quitar, vaciar, cobrar }: { pedido: Pedido; productos: ProductoPos[]; cotizacion: number | null; conectado: boolean; agregar: (p: ProductoPos) => void; quitar: (id: string) => void; vaciar: () => void; cobrar: () => void }) {
  const total = totalGs(pedido)
  return <section aria-label="Pedido" className="flex h-full flex-col gap-4 bg-card p-4">
    <div className="flex items-center justify-between"><h2 className="font-heading text-xl font-semibold">Pedido</h2><button type="button" onClick={vaciar} disabled={!pedido.length} className="min-h-11 px-3 font-bold text-marca disabled:opacity-50">Vaciar</button></div>
    <div className="flex-1 space-y-3">{pedido.length === 0 ? <p className="text-muted-foreground">El pedido está vacío.</p> : pedido.map(linea => {
      const producto = productos.find(p => p.id === linea.productoId)!
      return (
        <div key={linea.productoId} className="border-b pb-3">
          <div className="flex justify-between gap-2">
            <span className="font-bold">{linea.nombre}</span>
            <span className="tabular-nums">{formatoGs(linea.precioGs * linea.cantidad)}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <button type="button" aria-label={`Quitar ${linea.nombre}`} onClick={() => quitar(linea.productoId)} className="size-11 rounded-lg bg-muted text-xl">−</button>
            <span className="min-w-6 text-center tabular-nums">{linea.cantidad}</span>
            <button type="button" aria-label={`Agregar ${linea.nombre}`} onClick={() => agregar(producto)} disabled={producto.controlaStock && linea.cantidad >= producto.stock} className="size-11 rounded-lg bg-muted text-xl disabled:opacity-50">+</button>
          </div>
        </div>
      )
    })}</div>
    <div className="border-t pt-4"><p className="text-sm font-bold">Total</p><p className="font-heading text-[30px] font-semibold tabular-nums text-precio">{formatoGs(total)}</p>{cotizacion !== null && <p className="tabular-nums text-muted-foreground">≈ {formatoBrl(equivalenteBrl(total, cotizacion))}</p>}</div>
    <button type="button" disabled={!pedido.length || !conectado} onClick={cobrar} className="min-h-14 w-full rounded-xl bg-primary font-heading text-lg font-bold text-primary-foreground disabled:opacity-50">COBRAR</button>
  </section>
}

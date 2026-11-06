import type { Pedido, ProductoPos } from '@/lib/pos/pedido'
import { cantidadDe } from '@/lib/pos/pedido'
import { formatoGs } from '@/lib/pos/formato'

export function GrillaProductos({ productos, pedido, agregar }: { productos: ProductoPos[]; pedido: Pedido; agregar: (p: ProductoPos) => void }) {
  if (!productos.length) return <p className="py-8 text-muted-foreground">No hay productos para mostrar.</p>
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{productos.map(p => {
    const cantidad = cantidadDe(pedido, p.id); const agotado = p.controlaStock && p.stock <= 0
    return <button key={p.id} type="button" disabled={agotado} onClick={() => agregar(p)} className="relative flex min-h-[76px] flex-col items-start justify-center gap-1 rounded-xl border bg-superficie-boton p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring enabled:hover:bg-accent disabled:cursor-not-allowed">
      <span className="pr-6 text-sm font-extrabold">{p.nombre}</span><span className="font-heading text-[15px] font-semibold tabular-nums text-precio">{formatoGs(p.precioGs)}</span>
      {agotado ? <span className="text-sm font-bold text-aviso-texto">Sin stock</span> : p.controlaStock && p.stock <= 5 ? <span className="text-sm text-aviso-texto">quedan {p.stock}</span> : null}
      {cantidad > 0 && <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{cantidad}</span>}
    </button>
  })}</div>
}

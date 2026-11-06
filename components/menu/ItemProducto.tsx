import Image from 'next/image'
import { Palmera } from '@/components/marca/Palmera'
import type { ProductoMenu } from '@/lib/menu/armar'
import { formatoGs } from '@/lib/pos/formato'

export function ItemProducto({ producto }: { producto: ProductoMenu }) {
  return <article className="flex gap-4 border-b border-border py-5">
    <div className={`flex size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-muted ${producto.agotado ? 'grayscale' : ''}`}>
      {producto.fotoUrl ? <Image src={producto.fotoUrl} alt={producto.nombre} width={72} height={72} unoptimized loading="lazy" className="size-full object-cover" /> : <Palmera size={42} />}
    </div>
    <div className="min-w-0 flex-1">
      <h3 className={`font-extrabold ${producto.agotado ? 'text-muted-foreground' : ''}`}>{producto.nombre}</h3>
      {producto.descripcion && <p className="mt-1 text-sm text-muted-foreground">{producto.descripcion}</p>}
      <p className={`mt-2 font-heading text-lg font-semibold ${producto.agotado ? 'text-muted-foreground' : 'text-precio'}`}>{formatoGs(producto.precioGs)}</p>
      {producto.agotado && <span className="mt-1 inline-block rounded bg-aviso-fondo px-2 py-1 text-xs font-extrabold text-aviso">AGOTADO</span>}
    </div>
  </article>
}

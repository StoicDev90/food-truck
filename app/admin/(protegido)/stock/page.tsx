import Link from 'next/link'
import { requerirAcceso } from '@/lib/auth/sesion'
import { crearClienteServidor } from '@/lib/supabase/server'
import { formatoFechaHora } from '@/lib/admin/fechas'
import { FormMovimientoStock } from '@/components/admin/FormMovimientoStock'

export default async function Page({ searchParams }: { searchParams: Promise<{ producto?: string }> }) {
  await requerirAcceso('admin')
  const { producto } = await searchParams
  const db = await crearClienteServidor()
  const productos = await db.from('productos').select('id,nombre,stock').eq('controla_stock', true).order('nombre')
  if (productos.error) return <main className="p-6"><h1 className="font-heading text-2xl">Stock</h1><p role="alert">No se pudo cargar el stock. Probá de nuevo.</p></main>
  const seleccionado = productos.data.find(p => p.id === producto)
  const movimientos = seleccionado ? await db.from('movimientos_stock').select('id,created_at,tipo,cantidad,motivo,perfiles(nombre)').eq('producto_id', seleccionado.id).order('created_at', { ascending: false }).limit(200) : null
  return <main className="space-y-6 p-4 sm:p-6">
    <h1 className="font-heading text-2xl font-semibold">Stock</h1>
    <section><h2 className="font-heading text-xl">Productos</h2>
      {productos.data.length === 0 ? <p>No hay productos con control de stock.</p> : <ul className="divide-y">{productos.data.map(p => <li key={p.id}><Link href={`/admin/stock?producto=${p.id}`} aria-current={p.id === seleccionado?.id ? 'page' : undefined} className="flex min-h-11 items-center justify-between gap-4 py-2 underline-offset-4 hover:underline"><span>{p.nombre}</span><span>Stock: {p.stock}</span></Link></li>)}</ul>}
    </section>
    {seleccionado && <section className="space-y-4"><h2 className="font-heading text-xl">{seleccionado.nombre} · Stock: {seleccionado.stock}</h2>
      <FormMovimientoStock key={seleccionado.id} productoId={seleccionado.id} />
      <h3 className="font-heading text-xl">Historial</h3>
      {movimientos?.error ? <p role="alert">No se pudo cargar el historial. Probá de nuevo.</p> : movimientos?.data.length === 0 ? <p>No hay movimientos.</p> : <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr><th>Fecha y hora</th><th>Tipo</th><th>Cantidad</th><th>Motivo</th><th>Quién</th></tr></thead><tbody>{movimientos?.data.map(m => <tr key={m.id} className="border-t"><td className="py-2 pr-4 whitespace-nowrap">{formatoFechaHora(m.created_at)}</td><td className="pr-4">{m.tipo}</td><td className="pr-4">{m.cantidad > 0 ? '+' : ''}{m.cantidad}</td><td className="pr-4">{m.motivo || '—'}</td><td>{m.perfiles?.nombre ?? '—'}</td></tr>)}</tbody></table></div>}
    </section>}
  </main>
}

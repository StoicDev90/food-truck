'use client'
import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { cambiarActivoProducto, type EntradaProducto } from '@/lib/admin/catalogo'
import { formatoGs } from '@/lib/pos/formato'
import { urlImagen } from '@/lib/imagenes'
import { useEnvio } from '@/lib/admin/useEnvio'
import { Button } from '@/components/ui/button'
import { FormProducto } from './FormProducto'

type Producto = EntradaProducto & { id: string; activo: boolean; stock: number }
type Categoria = { id: string; nombre: string }
function Fila({ p, categorias, editar }: { p: Producto; categorias: Categoria[]; editar: () => void }) {
  const router = useRouter(); const { enviar, enviando } = useEnvio(); const [error, setError] = useState('')
  function cambiar() { void enviar(async () => { const r = await cambiarActivoProducto(p.id, !p.activo); if (!r.ok) setError(r.error); else router.refresh() }) }
  const url = urlImagen(p.fotoPath)
  return <tr className="border-b"><td className="p-2">{url ? <Image src={url} alt="" width={40} height={40} unoptimized className="size-10 rounded object-cover" /> : '—'}</td><td className="p-2">{p.nombre}{error && <p role="alert" className="text-destructive-texto">{error}</p>}</td><td className="p-2">{categorias.find(c => c.id === p.categoriaId)?.nombre ?? '—'}</td><td className="p-2">{formatoGs(p.precioGs)}</td><td className="p-2">{p.costoGs === null ? '—' : formatoGs(p.costoGs)}</td><td className="p-2">{p.controlaStock ? p.stock === 0 ? <span className="text-destructive-texto">Sin stock</span> : p.stock : '—'}</td><td className="p-2">{p.visible ? 'Visible' : 'Oculto'}</td><td className="p-2 whitespace-nowrap"><Button className="min-h-11" variant="outline" onClick={editar}>Editar</Button> <Button className="min-h-11" variant="outline" disabled={enviando} onClick={cambiar}>{enviando ? 'Guardando…' : p.activo ? 'Archivar' : 'Restaurar'}</Button></td></tr>
}
export function TablaProductos({ productos, categorias }: { productos: Producto[]; categorias: Categoria[] }) {
  const [categoria, setCategoria] = useState(''); const [archivados, setArchivados] = useState(false); const [editando, setEditando] = useState<string | null>(null); const [nuevo, setNuevo] = useState(false)
  const seleccion = productos.find(p => p.id === editando)
  return <div className="space-y-4"><div className="flex flex-wrap items-center gap-4"><label>Categoría <select className="min-h-11 rounded-md border bg-background p-2" value={categoria} onChange={e => setCategoria(e.target.value)}><option value="">Todas</option>{categorias.map(c => <option value={c.id} key={c.id}>{c.nombre}</option>)}</select></label><label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={archivados} onChange={e => setArchivados(e.target.checked)} />Ver archivados</label><Button className="min-h-11" onClick={() => { setNuevo(!nuevo); setEditando(null) }}>{nuevo ? 'Cancelar' : 'Nuevo producto'}</Button></div>
    {!categorias.length && <p>Creá una categoría antes de agregar productos.</p>}
    {nuevo && <FormProducto categorias={categorias} onGuardado={() => setNuevo(false)} />}
    {seleccion && <div><div className="flex items-center justify-between"><h2 className="font-heading text-xl">Editar {seleccion.nombre}</h2><Button className="min-h-11" variant="outline" onClick={() => setEditando(null)}>Cerrar</Button></div><FormProducto key={seleccion.id} categorias={categorias} producto={seleccion} onGuardado={() => setEditando(null)} /></div>}
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Foto</th><th className="p-2">Nombre</th><th className="p-2">Categoría</th><th className="p-2">Precio</th><th className="p-2">Costo</th><th className="p-2">Stock</th><th className="p-2">Menú</th><th className="p-2">Acciones</th></tr></thead><tbody>{productos.filter(p => (archivados || p.activo) && (!categoria || p.categoriaId === categoria)).map(p => <Fila key={p.id} p={p} categorias={categorias} editar={() => { setNuevo(false); setEditando(p.id) }} />)}</tbody></table></div></div>
}

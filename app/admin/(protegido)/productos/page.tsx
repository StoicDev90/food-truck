import { requerirAcceso } from '@/lib/auth/sesion'
import { crearClienteServidor } from '@/lib/supabase/server'
import { TablaProductos } from '@/components/admin/TablaProductos'

export default async function Page() {
  await requerirAcceso('admin')
  const db = await crearClienteServidor()
  const [productos, categorias, costos] = await Promise.all([
    db.from('productos').select('id,categoria_id,nombre,descripcion,precio_gs,controla_stock,visible,foto_path,activo,stock').order('nombre'),
    db.from('categorias').select('id,nombre').order('orden'),
    db.rpc('costos_productos'),
  ])
  if (productos.error || categorias.error || costos.error) return <main className="p-6"><h1 className="font-heading text-2xl">Productos</h1><p role="alert">No se pudo cargar el catálogo. Probá de nuevo.</p></main>
  const lista = (productos.data ?? []).map(p => ({ id: p.id, categoriaId: p.categoria_id, nombre: p.nombre, descripcion: p.descripcion ?? '', precioGs: p.precio_gs, costoGs: costos.data?.find(c => c.producto_id === p.id)?.costo_gs ?? null, controlaStock: p.controla_stock, visible: p.visible, fotoPath: p.foto_path, activo: p.activo, stock: p.stock }))
  return <main className="space-y-6 p-4 sm:p-6"><h1 className="font-heading text-2xl font-semibold">Productos</h1><TablaProductos productos={lista} categorias={categorias.data ?? []} /></main>
}

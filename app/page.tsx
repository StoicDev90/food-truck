import { EncabezadoMenu } from '@/components/menu/EncabezadoMenu'
import { ItemProducto } from '@/components/menu/ItemProducto'
import { PieMenu } from '@/components/menu/PieMenu'
import { cargarMenu } from '@/lib/menu/datos'
import { OFFSET_ANCLA_MENU } from '@/lib/menu/scroll-spy'

export const metadata = { title: 'Oasis Itaipu · Menú', description: 'Comidas y bebidas en el Parque Tacurú Pucú' }

export default async function Home() {
  const menu = await cargarMenu()
  return <div>
    <EncabezadoMenu menu={menu} />
    <main className="mx-auto max-w-2xl px-4">
      {menu.secciones.length ? menu.secciones.map(seccion => <section key={seccion.id} id={`cat-${seccion.id}`} style={{ scrollMarginTop: OFFSET_ANCLA_MENU }} className="pt-8">
        <h2 className="font-heading text-2xl font-semibold text-marca">{seccion.nombre}</h2>
        {seccion.productos.map(producto => <ItemProducto key={producto.id} producto={producto} />)}
      </section>) : <p className="py-12 text-center">Pronto vas a ver el menú acá.</p>}
      <PieMenu menu={menu} />
    </main>
  </div>
}

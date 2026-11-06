import { validarHorarios, type Horarios } from '@/lib/admin/horarios'
import { urlImagen } from '@/lib/imagenes'

export type ProductoMenu = { id: string; nombre: string; descripcion: string | null; fotoUrl: string | null; precioGs: number; agotado: boolean }
export type SeccionMenu = { id: string; nombre: string; productos: ProductoMenu[] }
export type DatosMenu = { nombre: string; logoUrl: string | null; horarios: Horarios | null; whatsapp: string | null; instagram: string | null; ubicacion: string | null; secciones: SeccionMenu[] }

type Entrada = {
  categorias: { id: string; nombre: string; orden: number }[]
  productos: { id: string; categoria_id: string; nombre: string; descripcion: string | null; foto_path: string | null; precio_gs: number; stock: number; controla_stock: boolean }[]
  config: { nombre: string; logo_path: string | null; horarios: unknown; whatsapp: string | null; instagram: string | null; ubicacion: string | null } | null
}

export function armarMenu({ categorias, productos, config }: Entrada): DatosMenu {
  const secciones = [...categorias].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es')).map(c => ({
    id: c.id, nombre: c.nombre,
    productos: productos.filter(p => p.categoria_id === c.id).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map(p => ({
      id: p.id, nombre: p.nombre, descripcion: p.descripcion, fotoUrl: urlImagen(p.foto_path), precioGs: p.precio_gs, agotado: p.controla_stock && p.stock <= 0,
    })),
  })).filter(c => c.productos.length > 0)
  return { nombre: config?.nombre ?? 'Oasis Itaipu', logoUrl: urlImagen(config?.logo_path ?? null), horarios: validarHorarios(config?.horarios), whatsapp: config?.whatsapp ?? null, instagram: config?.instagram ?? null, ubicacion: config?.ubicacion ?? null, secciones }
}

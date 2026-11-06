import { expect, test } from 'vitest'
import { armarMenu } from '@/lib/menu/armar'
import { urlImagen } from '@/lib/imagenes'

const categorias = [{ id: 'b', nombre: 'Z', orden: 1 }, { id: 'a', nombre: 'A', orden: 1 }, { id: 'v', nombre: 'Vacía', orden: 0 }]
const base = { descripcion: null, foto_path: null, precio_gs: 8000, stock: 0 }
const productos = [
  { ...base, id: '1', categoria_id: 'a', nombre: 'Zumo', controla_stock: false },
  { ...base, id: '2', categoria_id: 'a', nombre: 'Agua', foto_path: 'productos/agua.jpg', controla_stock: true },
  { ...base, id: '3', categoria_id: 'b', nombre: 'Otro', controla_stock: true },
]
test('ordena secciones y productos, transforma imagen y stock', () => {
  const menu = armarMenu({ categorias, productos, config: null })
  expect(menu.nombre).toBe('Oasis Itaipu')
  expect(menu.logoUrl).toBeNull()
  expect(menu.secciones.map(s => s.nombre)).toEqual(['A', 'Z'])
  expect(menu.secciones[0].productos).toEqual([
    { id: '2', nombre: 'Agua', descripcion: null, fotoUrl: urlImagen('productos/agua.jpg'), precioGs: 8000, agotado: true },
    { id: '1', nombre: 'Zumo', descripcion: null, fotoUrl: null, precioGs: 8000, agotado: false },
  ])
})
test('valida horarios y conserva configuración', () => {
  const config = { nombre: 'Oasis', logo_path: 'marca/logo.png', horarios: {}, whatsapp: '123', instagram: 'ig', ubicacion: 'Aquí' }
  expect(armarMenu({ categorias: [], productos: [], config })).toMatchObject({ nombre: 'Oasis', logoUrl: urlImagen(config.logo_path), horarios: null, whatsapp: '123', instagram: 'ig', ubicacion: 'Aquí' })
  const horarios = { lun: { abre: '25:00', cierra: '02:00' }, mar: null, mie: null, jue: null, vie: null, sab: null, dom: null }
  expect(armarMenu({ categorias: [], productos: [], config: { ...config, horarios } }).horarios).toBeNull()
})

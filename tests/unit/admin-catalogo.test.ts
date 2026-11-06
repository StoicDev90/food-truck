import { beforeEach, expect, it, vi } from 'vitest'
import { getRedirectError } from 'next/dist/client/components/redirect'
const m = vi.hoisted(() => ({ acceso: vi.fn(), from: vi.fn(), tag: vi.fn() }))
vi.mock('@/lib/auth/sesion', () => ({ requerirAcceso: m.acceso }))
vi.mock('@/lib/supabase/server', () => ({ crearClienteServidor: async () => ({ from: m.from }) }))
vi.mock('next/cache', () => ({ updateTag: m.tag }))
import { crearProducto, editarProducto, cambiarActivoProducto, crearCategoria, editarCategoria, borrarCategoria } from '@/lib/admin/catalogo'
const id = '123e4567-e89b-42d3-a456-426614174000'
const producto = { categoriaId: id, nombre: 'Pan', descripcion: '', precioGs: 8000, costoGs: null, controlaStock: false, visible: true, fotoPath: null }
beforeEach(() => { vi.resetAllMocks(); m.acceso.mockResolvedValue({}) })
it.each([{ nombre: '' }, { nombre: 'a'.repeat(81) }, { descripcion: 'a'.repeat(201) }, { precioGs: 1.5 }, { costoGs: -1 }, { categoriaId: 'x' }, { fotoPath: '../x.png' }])('rechaza producto inválido %o antes de la base', async cambio => {
  expect((await crearProducto({ ...producto, ...cambio })).ok).toBe(false)
  expect(m.from).not.toHaveBeenCalled()
})
it('traduce la categoría en uso', async () => {
  m.from.mockReturnValue({ delete: () => ({ eq: async () => ({ error: { code: '23503' } }) }) })
  expect(await borrarCategoria(id)).toMatchObject({ ok: false, codigo: 'CATEGORIA_EN_USO' })
})
it('propaga redirección antes de consultar', async () => {
  const error = getRedirectError('/login', 'replace'); m.acceso.mockRejectedValue(error)
  await expect(crearProducto(producto)).rejects.toBe(error)
  expect(m.from).not.toHaveBeenCalled()
})

it('invalida el menú tras cada escritura exitosa', async () => {
  const eq = vi.fn().mockResolvedValue({ error: null })
  m.from.mockImplementation((tabla: string) => tabla === 'productos' ? {
    insert: () => ({ select: () => ({ single: async () => ({ data: { id }, error: null }) }) }),
    select: () => ({ eq: () => ({ single: async () => ({ data: { foto_path: null }, error: null }) }) }),
    update: () => ({ eq }),
  } : { insert: async () => ({ error: null }), update: () => ({ eq }), delete: () => ({ eq }) })
  expect((await crearProducto(producto)).ok).toBe(true)
  expect((await editarProducto(id, producto)).ok).toBe(true)
  expect((await cambiarActivoProducto(id, false)).ok).toBe(true)
  expect((await crearCategoria('Comida', 0)).ok).toBe(true)
  expect((await editarCategoria(id, 'Comida', 1)).ok).toBe(true)
  expect((await borrarCategoria(id)).ok).toBe(true)
  expect(m.tag).toHaveBeenCalledTimes(6)
  expect(m.tag).toHaveBeenCalledWith('menu')
  expect(m.acceso).toHaveBeenCalledTimes(6)
  expect(m.acceso).toHaveBeenCalledWith('admin')
})

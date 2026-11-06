import { afterAll, expect, test } from 'vitest'
import { admin, crearProducto } from './helpers'
import { crearClientePublico } from '@/lib/supabase/publico'

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.SUPABASE_URL
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
const ids: string[] = []
afterAll(async () => {
  if (ids.length) {
    const { error } = await admin.from('productos').delete().in('id', ids)
    if (error) throw error
  }
})
test('anon ve solo productos públicos y no puede leer el costo', async () => {
  ids.push(await crearProducto({ stock: 4, controlaStock: true }), await crearProducto({ visible: false }), await crearProducto({ activo: false }))
  const cliente = crearClientePublico()
  const { data, error } = await cliente.from('productos').select('id, categoria_id, nombre, descripcion, foto_path, precio_gs, stock, controla_stock').in('id', ids)
  expect(error).toBeNull()
  expect(data).toHaveLength(1)
  expect(data?.[0]).toMatchObject({ id: ids[0], stock: 4, controla_stock: true })
  const costo = await cliente.from('productos').select('costo_gs').eq('id', ids[0])
  expect(costo.error).not.toBeNull()
})

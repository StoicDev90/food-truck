import { beforeEach, describe, expect, it } from 'vitest'
import { emailDeUsuario } from '@/lib/auth/empleado'
import { admin, anon, crearProducto, crearUsuario, limpiarOperaciones } from './helpers'

beforeEach(limpiarOperaciones)

describe('esquema', () => {
  it('permite un solo turno abierto', async () => {
    const e1 = await crearUsuario('empleado')
    const e2 = await crearUsuario('empleado')
    await admin.from('turnos').insert({ empleado_id: e1.id, fondo_gs: 0, fondo_brl: 0 })
    const { error } = await admin.from('turnos').insert({ empleado_id: e2.id, fondo_gs: 0, fondo_brl: 0 })
    expect(error?.code).toBe('23505')
  })

  it('configuración es de fila única', async () => {
    expect((await admin.from('configuracion').insert({ id: 2 })).error).not.toBeNull()
    expect((await admin.from('configuracion').select()).data).toHaveLength(1)
  })

  it('stock no puede ser negativo', async () => {
    const p = await crearProducto()
    expect((await admin.from('productos').update({ stock: -1 }).eq('id', p)).error).not.toBeNull()
  })

  it('el email sintético de empleado sirve para loguearse con PIN', async () => {
    const e1 = await crearUsuario('empleado')
    const { error } = await anon.auth.signInWithPassword({
      email: emailDeUsuario(e1.usuario),
      password: '123456',
    })
    expect(error).toBeNull()
  })
})

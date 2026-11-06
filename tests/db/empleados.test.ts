import { expect, it } from 'vitest'
import { admin, anon, crearUsuario } from './helpers'
import { emailDeUsuario } from '@/lib/auth/empleado'
import { derivarPasswordEmpleado } from '@/lib/auth/pin-derivacion'
import { claveCuentaEmpleado } from '@/lib/auth/claves-login'

it('alta y cambio de PIN usan contraseña derivada y limpian solo el bloqueo de cuenta', async () => {
  const e = await crearUsuario('empleado')
  const email = emailDeUsuario(e.usuario)
  const anterior = derivarPasswordEmpleado(e.usuario, '123456', process.env.EMPLEADO_PIN_PEPPER)
  const nuevo = derivarPasswordEmpleado(e.usuario, '654321', process.env.EMPLEADO_PIN_PEPPER)
  expect((await anon.auth.signInWithPassword({ email, password: anterior })).error).toBeNull()
  const cuenta = claveCuentaEmpleado(e.usuario); const ip = `ip:test-${e.usuario}`
  expect((await admin.from('intentos_login').insert([{ clave: cuenta }, { clave: ip }])).error).toBeNull()
  expect((await admin.auth.admin.updateUserById(e.id, { password: nuevo })).error).toBeNull()
  expect((await admin.from('intentos_login').delete().eq('clave', cuenta)).error).toBeNull()
  expect((await anon.auth.signInWithPassword({ email, password: nuevo })).error).toBeNull()
  expect((await anon.auth.signInWithPassword({ email, password: anterior })).error).not.toBeNull()
  const filas = await admin.from('intentos_login').select('clave').in('clave', [cuenta, ip])
  expect(filas.data).toEqual([{ clave: ip }])
  await admin.from('intentos_login').delete().eq('clave', ip)
})
it('desactivar una sesión viva impide registrar ventas', async () => {
  const e = await crearUsuario('empleado')
  expect((await admin.from('perfiles').update({ activo: false }).eq('id', e.id)).error).toBeNull()
  const r = await e.client.rpc('registrar_venta', { p_clave: crypto.randomUUID(), p_items: [], p_medio: 'tarjeta' })
  expect(r.error?.message).toBe('NO_AUTORIZADO')
})

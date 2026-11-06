import { beforeEach, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({ acceso: vi.fn(), create: vi.fn(), remove: vi.fn(), updateUser: vi.fn(), from: vi.fn(), password: vi.fn() }))
vi.mock('@/lib/auth/sesion', () => ({ requerirAcceso: m.acceso }))
vi.mock('@/lib/auth/pin', () => ({ passwordEmpleado: m.password }))
vi.mock('@/lib/supabase/admin', () => ({ crearClienteAdmin: () => ({ auth: { admin: { createUser: m.create, deleteUser: m.remove, updateUserById: m.updateUser } }, from: m.from }) }))
import { crearEmpleado, resetearPin, cambiarActivoEmpleado, desbloquearEmpleado } from '@/lib/admin/empleados'
const id = '123e4567-e89b-42d3-a456-426614174000'
beforeEach(() => { vi.resetAllMocks(); m.acceso.mockResolvedValue({}); m.password.mockReturnValue('derivada'); m.create.mockResolvedValue({ data: { user: { id } }, error: null }); m.remove.mockResolvedValue({ error: null }) })
it('rechaza usuario o PIN inválido sin llamar Auth', async () => {
  expect(await crearEmpleado({ nombre: 'Juan', usuario: 'juan', pin: '12345' })).toMatchObject({ codigo: 'VALOR_INVALIDO' })
  expect(await crearEmpleado({ nombre: 'Juan', usuario: 'Juan Pérez', pin: '123456' })).toMatchObject({ codigo: 'VALOR_INVALIDO' })
  expect(m.create).not.toHaveBeenCalled()
})
it('crea con contraseña derivada y revierte Auth si falla el perfil', async () => {
  m.from.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: { code: '23505' } }) })
  expect(await crearEmpleado({ nombre: 'Juan', usuario: ' JUAN ', pin: '123456' })).toMatchObject({ codigo: 'USUARIO_EXISTE' })
  expect(m.password).toHaveBeenCalledWith('juan', '123456')
  expect(m.create).toHaveBeenCalledWith({ email: 'juan@empleados.local', password: 'derivada', email_confirm: true })
  expect(m.remove).toHaveBeenCalledWith(id)
})
it('no modifica un dueño', async () => {
  m.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { rol: 'dueno', usuario: null }, error: null }) }) }) })
  expect(await resetearPin(id, '123456')).toMatchObject({ codigo: 'NO_AUTORIZADO' })
  expect(await cambiarActivoEmpleado(id, false)).toMatchObject({ codigo: 'NO_AUTORIZADO' })
  expect(await desbloquearEmpleado(id)).toMatchObject({ codigo: 'NO_AUTORIZADO' })
  expect(m.updateUser).not.toHaveBeenCalled()
})
it('resetea contraseña derivada y borra solo la clave de cuenta', async () => {
  const eq = vi.fn().mockResolvedValue({ error: null })
  m.from.mockImplementation((tabla: string) => tabla === 'perfiles' ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { rol: 'empleado', usuario: 'juan' }, error: null }) }) }) } : { delete: () => ({ eq }) })
  m.updateUser.mockResolvedValue({ error: null })
  expect(await resetearPin(id, '654321')).toEqual({ ok: true, data: null })
  expect(m.updateUser).toHaveBeenCalledWith(id, { password: 'derivada' })
  expect(m.password).toHaveBeenCalledWith('juan', '654321')
  expect(eq).toHaveBeenCalledWith('clave', 'usuario:juan')
  expect(await desbloquearEmpleado(id)).toEqual({ ok: true, data: null })
  expect(eq).toHaveBeenCalledTimes(2)
})
it('cambia estado solo del perfil empleado', async () => {
  const rol = vi.fn().mockResolvedValue({ error: null })
  m.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { rol: 'empleado', usuario: 'juan' }, error: null }) }) }), update: (v: unknown) => { expect(v).toEqual({ activo: false }); return { eq: () => ({ eq: rol }) } } })
  expect(await cambiarActivoEmpleado(id, false)).toEqual({ ok: true, data: null })
  expect(rol).toHaveBeenCalledWith('rol', 'empleado')
})

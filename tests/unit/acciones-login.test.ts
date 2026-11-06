import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  reservarIntento: vi.fn(),
  limpiarFallos: vi.fn(),
  obtenerPerfil: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '1.2.3.4' }),
}))
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`)
  },
}))
vi.mock('@/lib/supabase/server', () => ({
  crearClienteServidor: async () => ({
    auth: { signInWithPassword: m.signIn, signOut: m.signOut },
  }),
}))
vi.mock('@/lib/auth/sesion', () => ({ obtenerPerfil: m.obtenerPerfil }))
vi.mock('@/lib/auth/limite-login', async () => ({
  ...(await import('@/lib/auth/claves-login')),
  MENSAJE_BLOQUEO: 'BLOQUEO',
  reservarIntento: m.reservarIntento,
  limpiarFallos: m.limpiarFallos,
}))

import { loginDueno, loginEmpleado } from '@/lib/auth/acciones'

const fd = (o: Record<string, string>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(o)) f.set(k, v)
  return f
}
const prev = { error: null }

const casos = [
  {
    nombre: 'loginEmpleado',
    accion: loginEmpleado,
    form: fd({ usuario: ' Pepe ', pin: '123456' }),
    cuenta: 'usuario:pepe',
    errorGenerico: 'Usuario o PIN incorrecto',
    destino: '/pos',
    perfilOk: { id: '1', nombre: 'P', rol: 'empleado', activo: true },
    perfilMal: { id: '1', nombre: 'P', rol: 'empleado', activo: false },
    msgPerfilMal: 'Usuario o PIN incorrecto',
  },
  {
    nombre: 'loginDueno',
    accion: loginDueno,
    form: fd({ email: ' A@B.com ', password: 'x' }),
    cuenta: 'email:a@b.com',
    errorGenerico: 'Email o contraseña incorrectos',
    destino: '/admin',
    perfilOk: { id: '1', nombre: 'D', rol: 'dueno', activo: true },
    perfilMal: { id: '1', nombre: 'D', rol: 'empleado', activo: true },
    msgPerfilMal: 'Esta cuenta no tiene acceso al panel',
  },
]

beforeEach(() => {
  vi.resetAllMocks()
  m.reservarIntento.mockResolvedValue(true)
  m.signIn.mockResolvedValue({ error: null })
})

describe.each(casos)('$nombre', (c) => {
  it('bloqueado: devuelve MENSAJE_BLOQUEO sin signIn ni limpiarFallos', async () => {
    m.reservarIntento.mockResolvedValue(false)
    expect(await c.accion(prev, c.form)).toEqual({ error: 'BLOQUEO' })
    expect(m.reservarIntento).toHaveBeenCalledWith(c.cuenta, 'ip:1.2.3.4')
    expect(m.signIn).not.toHaveBeenCalled()
    expect(m.limpiarFallos).not.toHaveBeenCalled()
  })

  it('signIn falla: el intento ya estaba reservado; error genérico y sin limpiar', async () => {
    m.signIn.mockResolvedValue({ error: new Error('bad') })
    expect(await c.accion(prev, c.form)).toEqual({ error: c.errorGenerico })
    expect(m.reservarIntento).toHaveBeenCalledWith(c.cuenta, 'ip:1.2.3.4')
    expect(m.limpiarFallos).not.toHaveBeenCalled()
  })

  it('signIn ok con perfil inválido: limpia, signOut, ', async () => {
    m.obtenerPerfil.mockResolvedValue(c.perfilMal)
    expect(await c.accion(prev, c.form)).toEqual({ error: c.msgPerfilMal })
    expect(m.limpiarFallos).toHaveBeenCalledWith(c.cuenta, 'ip:1.2.3.4')
    expect(m.signOut).toHaveBeenCalled()
  })

  it('signIn ok con perfil válido: limpia y redirige', async () => {
    m.obtenerPerfil.mockResolvedValue(c.perfilOk)
    await expect(c.accion(prev, c.form)).rejects.toThrow(`REDIRECT:${c.destino}`)
    expect(m.limpiarFallos).toHaveBeenCalledWith(c.cuenta, 'ip:1.2.3.4')
  })

  it('reservarIntento rechaza: la acción rechaza (fail-closed) sin signIn', async () => {
    m.reservarIntento.mockRejectedValue(new Error('db caída'))
    await expect(c.accion(prev, c.form)).rejects.toThrow('db caída')
    expect(m.signIn).not.toHaveBeenCalled()
  })
})

describe('loginEmpleado formato inválido', () => {
  it('error genérico sin limiter ni signIn', async () => {
    expect(await loginEmpleado(prev, fd({ usuario: 'a', pin: '12' }))).toEqual({
      error: 'Usuario o PIN incorrecto',
    })
    expect(m.reservarIntento).not.toHaveBeenCalled()
    expect(m.signIn).not.toHaveBeenCalled()
  })
})

describe('loginDueno formato inválido', () => {
  it.each([
    ['email de empleado', 'pepe@empleados.local'],
    ['email de empleado en mayúsculas', ' Pepe@Empleados.LOCAL '],
    ['sin arroba', 'pepe'],
    ['vacío', ''],
    ['más de 254 caracteres', 'a'.repeat(250) + '@b.co'],
  ])('%s: error genérico sin limiter ni signIn', async (_n, email) => {
    expect(await loginDueno(prev, fd({ email, password: 'x' }))).toEqual({
      error: 'Email o contraseña incorrectos',
    })
    expect(m.reservarIntento).not.toHaveBeenCalled()
    expect(m.signIn).not.toHaveBeenCalled()
  })
})

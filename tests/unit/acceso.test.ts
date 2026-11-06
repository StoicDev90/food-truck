import { describe, expect, it } from 'vitest'
import { resolverAcceso } from '@/lib/auth/acceso'

describe('resolverAcceso', () => {
  it('sin perfil va a login', () => {
    expect(resolverAcceso(null, 'pos')).toBe('login')
    expect(resolverAcceso(null, 'admin')).toBe('login')
  })
  it('empleado activo entra a pos, no a admin', () => {
    expect(resolverAcceso({ rol: 'empleado', activo: true }, 'pos')).toBe('permitir')
    expect(resolverAcceso({ rol: 'empleado', activo: true }, 'admin')).toBe('login')
  })
  it('dueño activo entra a ambas', () => {
    expect(resolverAcceso({ rol: 'dueno', activo: true }, 'admin')).toBe('permitir')
    expect(resolverAcceso({ rol: 'dueno', activo: true }, 'pos')).toBe('permitir')
  })
  it('inactivo va a login', () => {
    expect(resolverAcceso({ rol: 'dueno', activo: false }, 'admin')).toBe('login')
    expect(resolverAcceso({ rol: 'empleado', activo: false }, 'pos')).toBe('login')
  })
})

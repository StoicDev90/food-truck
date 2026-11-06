import { describe, expect, it } from 'vitest'
import { claveTema, resolverTema } from '@/lib/tema'

describe('tema', () => {
  it('separa las preferencias del menú y del personal', () => {
    expect(claveTema('/pos')).toBe('tema-staff')
    expect(claveTema('/admin/productos')).toBe('tema-staff')
    expect(claveTema('/')).toBe('tema-menu')
    expect(claveTema('/posta')).toBe('tema-menu')
  })
  it('prioriza el valor guardado válido y usa el sistema como alternativa', () => {
    expect(resolverTema('oscuro', false)).toBe('oscuro')
    expect(resolverTema('claro', true)).toBe('claro')
    expect(resolverTema(null, true)).toBe('oscuro')
    expect(resolverTema('basura', false)).toBe('claro')
  })
})

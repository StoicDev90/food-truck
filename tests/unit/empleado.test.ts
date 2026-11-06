import { describe, it, expect } from 'vitest'
import {
  normalizarUsuario,
  validarUsuario,
  validarPin,
  emailDeUsuario,
} from '@/lib/auth/empleado'

describe('empleado', () => {
  it('normalizarUsuario', () => {
    expect(normalizarUsuario('  Juan ')).toBe('juan')
  })
  it('validarUsuario', () => {
    expect(validarUsuario('juan_2')).toBe(true)
    expect(validarUsuario(' Juan ')).toBe(true)
    expect(validarUsuario('ju')).toBe(false)
    expect(validarUsuario('juan pérez')).toBe(false)
  })
  it('validarPin', () => {
    expect(validarPin('123456')).toBe(true)
    expect(validarPin('12345')).toBe(false)
    expect(validarPin('12345a')).toBe(false)
  })
  it('emailDeUsuario', () => {
    expect(emailDeUsuario(' Juan ')).toBe('juan@empleados.local')
  })
})

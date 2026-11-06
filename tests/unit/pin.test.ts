import { describe, expect, it, vi } from 'vitest'
import { derivarPasswordEmpleado } from '@/lib/auth/pin-derivacion'

vi.mock('server-only', () => ({}))

const P = 'p'.repeat(32)

describe('derivarPasswordEmpleado', () => {
  it('es determinista', () => {
    expect(derivarPasswordEmpleado('pepe', '123456', P)).toBe(derivarPasswordEmpleado('pepe', '123456', P))
  })
  it('difiere por usuario, PIN y pepper', () => {
    const base = derivarPasswordEmpleado('pepe', '123456', P)
    expect(derivarPasswordEmpleado('juan', '123456', P)).not.toBe(base)
    expect(derivarPasswordEmpleado('pepe', '654321', P)).not.toBe(base)
    expect(derivarPasswordEmpleado('pepe', '123456', 'q'.repeat(32))).not.toBe(base)
  })
  it('normaliza el usuario', () => {
    expect(derivarPasswordEmpleado(' Pepe ', '123456', P)).toBe(derivarPasswordEmpleado('pepe', '123456', P))
  })
  it('es base64url de al menos 40 caracteres', () => {
    const r = derivarPasswordEmpleado('pepe', '123456', P)
    expect(r).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(r.length).toBeGreaterThanOrEqual(40)
  })
  it.each([undefined, '', 'corto', 'x'.repeat(31)])('pepper inválido %j lanza', (p) => {
    expect(() => derivarPasswordEmpleado('pepe', '123456', p)).toThrow(/EMPLEADO_PIN_PEPPER/)
  })
})

describe('passwordEmpleado (entorno)', () => {
  it('lee EMPLEADO_PIN_PEPPER y falla cerrado si falta', async () => {
    const { passwordEmpleado } = await import('@/lib/auth/pin')
    vi.stubEnv('EMPLEADO_PIN_PEPPER', P)
    expect(passwordEmpleado('pepe', '123456')).toBe(derivarPasswordEmpleado('pepe', '123456', P))
    vi.stubEnv('EMPLEADO_PIN_PEPPER', '')
    expect(() => passwordEmpleado('pepe', '123456')).toThrow(/EMPLEADO_PIN_PEPPER/)
    vi.unstubAllEnvs()
  })
})

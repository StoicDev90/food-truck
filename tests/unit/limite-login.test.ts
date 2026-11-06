import { describe, expect, it } from 'vitest'
import { claveCuentaDueno, claveCuentaEmpleado, ipDeEncabezados } from '@/lib/auth/claves-login'

describe('claves de límite de login', () => {
  it('normaliza cuenta de empleado y de dueño', () => {
    expect(claveCuentaEmpleado(' Pepe ')).toBe('usuario:pepe')
    expect(claveCuentaDueno(' A@B.com ')).toBe('email:a@b.com')
  })
  it('toma la primera IP de x-forwarded-for', () => {
    expect(ipDeEncabezados(new Headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }))).toBe('ip:1.2.3.4')
  })
  it('cae a x-real-ip y luego a desconocida', () => {
    expect(ipDeEncabezados(new Headers({ 'x-real-ip': '5.6.7.8' }))).toBe('ip:5.6.7.8')
    expect(ipDeEncabezados(new Headers())).toBe('ip:desconocida')
  })
})

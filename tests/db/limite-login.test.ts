import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { admin, anon, crearUsuario } from './helpers'

const id = () => randomUUID().replace(/-/g, '').slice(0, 12)
const nuevaCuenta = () => `usuario:t_${id()}`
const nuevaIp = () => `ip:t_${id()}`

async function fallar(cuenta: string, ip: string, n: number) {
  for (let i = 0; i < n; i++) {
    const { error } = await admin.rpc('registrar_fallo_login', { p_cuenta: cuenta, p_ip: ip })
    if (error) throw error
  }
}
async function bloqueado(cuenta: string, ip: string) {
  const { data, error } = await admin.rpc('login_bloqueado', { p_cuenta: cuenta, p_ip: ip })
  if (error) throw error
  return data
}

describe('límite de intentos de login', () => {
  it('bloquea la cuenta al 5.º fallo, no antes', async () => {
    const c = nuevaCuenta()
    const ip = nuevaIp()
    await fallar(c, ip, 4)
    expect(await bloqueado(c, ip)).toBe(false)
    await fallar(c, ip, 1)
    expect(await bloqueado(c, ip)).toBe(true)
  })

  it('bloquear una cuenta no bloquea otra cuenta desde otra IP', async () => {
    const c = nuevaCuenta()
    await fallar(c, nuevaIp(), 5)
    expect(await bloqueado(nuevaCuenta(), nuevaIp())).toBe(false)
  })

  it('20 fallos desde una IP con cuentas distintas bloquean la IP', async () => {
    const ip = nuevaIp()
    for (let i = 0; i < 20; i++) await fallar(nuevaCuenta(), ip, 1)
    expect(await bloqueado(nuevaCuenta(), ip)).toBe(true)
  })

  it('limpiar_fallos_login reinicia el conteo de la cuenta', async () => {
    const c = nuevaCuenta()
    const ip = nuevaIp()
    await fallar(c, ip, 3)
    const { error } = await admin.rpc('limpiar_fallos_login', { p_cuenta: c })
    expect(error).toBeNull()
    await fallar(c, ip, 2)
    expect(await bloqueado(c, ip)).toBe(false)
  })

  it('los fallos se olvidan tras 15 minutos sin otro fallo', async () => {
    const c = nuevaCuenta()
    const ip = nuevaIp()
    await fallar(c, ip, 4)
    const hace16 = new Date(Date.now() - 16 * 60_000).toISOString()
    const u = await admin.from('intentos_login').update({ ultimo_fallo: hace16 }).eq('clave', c)
    expect(u.error).toBeNull()
    await fallar(c, ip, 1)
    expect(await bloqueado(c, ip)).toBe(false)
  })

  it('un bloqueo vencido ya no bloquea', async () => {
    const c = nuevaCuenta()
    const ip = nuevaIp()
    await fallar(c, ip, 5)
    expect(await bloqueado(c, ip)).toBe(true)
    const pasado = new Date(Date.now() - 60_000).toISOString()
    await admin.from('intentos_login').update({ bloqueado_hasta: pasado }).eq('clave', c)
    expect(await bloqueado(c, ip)).toBe(false)
  })

  it('anon y empleado logueado no pueden llamar las funciones ni leer la tabla', async () => {
    const c = nuevaCuenta()
    await fallar(c, nuevaIp(), 1)
    const emp = await crearUsuario('empleado')
    for (const cli of [anon, emp.client]) {
      const r1 = await cli.rpc('login_bloqueado', { p_cuenta: c, p_ip: 'x' })
      expect(r1.error?.code).toBe('42501')
      const r2 = await cli.rpc('registrar_fallo_login', { p_cuenta: c, p_ip: 'x' })
      expect(r2.error?.code).toBe('42501')
      const r3 = await cli.rpc('limpiar_fallos_login', { p_cuenta: c })
      expect(r3.error?.code).toBe('42501')
      const s = await cli.from('intentos_login').select()
      expect(s.error ? s.error.code : s.data).toSatisfy((v: unknown) => v === '42501' || (Array.isArray(v) && v.length === 0))
    }
    const { data } = await admin.from('intentos_login').select().eq('clave', c)
    expect(data).toHaveLength(1)
  })
})

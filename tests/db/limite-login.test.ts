import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { admin, anon, crearUsuario } from './helpers'

const id = () => randomUUID().replace(/-/g, '').slice(0, 12)
const nuevaCuenta = () => `usuario:t_${id()}`
const nuevaIp = () => `ip:t_${id()}`

async function reservar(cuenta: string, ip: string): Promise<boolean> {
  const { data, error } = await admin.rpc('reservar_intento_login', { p_cuenta: cuenta, p_ip: ip })
  if (error) throw error
  return data as boolean
}
async function reservarN(cuenta: string, ip: string, n: number) {
  for (let i = 0; i < n; i++) await reservar(cuenta, ip)
}
async function fila(clave: string) {
  const { data, error } = await admin.from('intentos_login').select().eq('clave', clave).maybeSingle()
  if (error) throw error
  return data
}
const minutosDesdeAhora = (iso: string | null) => (new Date(iso!).getTime() - Date.now()) / 60_000

describe('límite de intentos de login', () => {
  it('permite 4 intentos y el 5.º queda contado y bloquea el 6.º', async () => {
    const c = nuevaCuenta()
    const ip = nuevaIp()
    for (let i = 0; i < 5; i++) expect(await reservar(c, ip)).toBe(true)
    expect(await reservar(c, ip)).toBe(false)
  })

  it('10 reservas en paralelo con filas ya sembradas: exactamente 4 true (FOR UPDATE)', async () => {
    const c = nuevaCuenta()
    const ip = nuevaIp()
    // Una reserva secuencial crea ambas filas; así el insert ... on conflict no serializa la carrera.
    expect(await reservar(c, ip)).toBe(true)
    const r = await Promise.all(Array.from({ length: 10 }, () => reservar(c, ip)))
    expect(r.filter(Boolean)).toHaveLength(4)
  })

  it('cuenta bloqueada: devuelve false y no incrementa nada', async () => {
    const c = nuevaCuenta()
    const ip = nuevaIp()
    await reservarN(c, ip, 5)
    const antesC = await fila(c)
    const antesI = await fila(ip)
    expect(await reservar(c, ip)).toBe(false)
    expect(await fila(c)).toEqual(antesC)
    expect(await fila(ip)).toEqual(antesI)
  })

  it('bloquear una cuenta no bloquea otra cuenta desde otra IP', async () => {
    await reservarN(nuevaCuenta(), nuevaIp(), 5)
    expect(await reservar(nuevaCuenta(), nuevaIp())).toBe(true)
  })

  it('IP: 19 intentos no bloquean, el 20.º sí bloquea al siguiente', async () => {
    const ip = nuevaIp()
    for (let i = 0; i < 19; i++) await reservar(nuevaCuenta(), ip)
    expect(await fila(ip)).toMatchObject({ fallos: 19, bloqueado_hasta: null })
    expect(await reservar(nuevaCuenta(), ip)).toBe(true)
    expect(await reservar(nuevaCuenta(), ip)).toBe(false)
  })

  it('duración del bloqueo: cuenta 5 min, IP 15 min', async () => {
    const c = nuevaCuenta()
    const ip = nuevaIp()
    await reservarN(c, ip, 5)
    expect(Math.abs(minutosDesdeAhora((await fila(c))!.bloqueado_hasta) - 5)).toBeLessThan(1)
    const ip2 = nuevaIp()
    for (let i = 0; i < 20; i++) await reservar(nuevaCuenta(), ip2)
    expect(Math.abs(minutosDesdeAhora((await fila(ip2))!.bloqueado_hasta) - 15)).toBeLessThan(1)
  })

  it('limpiar_fallos_login borra la cuenta y resta 1 a la IP', async () => {
    const c = nuevaCuenta()
    const ip = nuevaIp()
    await reservarN(c, ip, 3)
    const { error } = await admin.rpc('limpiar_fallos_login', { p_cuenta: c, p_ip: ip })
    expect(error).toBeNull()
    expect(await fila(c)).toBeNull()
    expect((await fila(ip))!.fallos).toBe(2)
    await reservarN(c, ip, 4)
    expect(await reservar(c, ip)).toBe(true)
  })

  it('los fallos se olvidan tras 15 minutos sin otro intento', async () => {
    const c = nuevaCuenta()
    const ip = nuevaIp()
    await reservarN(c, ip, 4)
    const hace16 = new Date(Date.now() - 16 * 60_000).toISOString()
    const u = await admin.from('intentos_login').update({ ultimo_fallo: hace16 }).eq('clave', c)
    expect(u.error).toBeNull()
    expect(await reservar(c, ip)).toBe(true)
    expect((await fila(c))!.fallos).toBe(1)
  })

  it('tras vencer un bloqueo, el conteo arranca de nuevo', async () => {
    const c = nuevaCuenta()
    const ip = nuevaIp()
    await reservarN(c, ip, 5)
    expect(await reservar(c, ip)).toBe(false)
    const pasado = new Date(Date.now() - 60_000).toISOString()
    await admin.from('intentos_login').update({ bloqueado_hasta: pasado }).eq('clave', c)
    expect(await reservar(c, ip)).toBe(true)
    expect((await fila(c))!.fallos).toBe(1)
  })

  it('anon y empleado logueado: 42501 en todas las funciones y sin filas en la tabla', async () => {
    const c = nuevaCuenta()
    await reservar(c, nuevaIp())
    const emp = await crearUsuario('empleado')
    for (const cli of [anon, emp.client]) {
      const rs = [
        await cli.rpc('reservar_intento_login', { p_cuenta: c, p_ip: 'x' }),
        await cli.rpc('limpiar_fallos_login', { p_cuenta: c, p_ip: 'x' }),
        await cli.rpc('_contar_fallo_login', { p_clave: c, p_umbral: 5, p_bloqueo: '5 minutes' } as never),
      ]
      for (const r of rs) expect(r.error?.code).toBe('42501')
      const s = await cli.from('intentos_login').select()
      expect(s.error ? s.error.code : s.data).toSatisfy(
        (v: unknown) => v === '42501' || (Array.isArray(v) && v.length === 0),
      )
    }
    expect(await fila(c)).not.toBeNull()
  })
})

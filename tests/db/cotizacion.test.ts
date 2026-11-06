import { beforeEach, describe, expect, it } from 'vitest'
import { admin, crearUsuario, limpiarOperaciones } from './helpers'

describe('cotización del día', () => {
  beforeEach(async () => {
    await limpiarOperaciones()
  })

  it('fecha_py usa America/Asuncion', async () => {
    expect((await admin.rpc('fecha_py', { ts: '2026-11-07T02:30:00Z' })).data).toBe('2026-11-06')
  })

  it('vigente, manual y permisos', async () => {
    const d = await crearUsuario('dueno')
    const e = await crearUsuario('empleado')
    expect((await e.client.rpc('cotizacion_vigente')).data).toBeNull()
    const hoy = (await admin.rpc('fecha_py')).data!
    const ayer = new Date(Date.parse(hoy) - 86_400_000).toISOString().slice(0, 10)
    await admin.rpc('registrar_cotizacion_api', { p_fecha: ayer, p_valor: 1440, p_fuente: 'test' })
    expect((await e.client.rpc('cotizacion_vigente')).data).toBeNull()
    await admin.rpc('registrar_cotizacion_api', { p_fecha: hoy, p_valor: 1450, p_fuente: 'test' })
    expect(Number((await e.client.rpc('cotizacion_vigente')).data)).toBe(1450)
    expect((await d.client.rpc('fijar_cotizacion_manual', { p_valor: 1400 })).error).toBeNull()
    await admin.rpc('registrar_cotizacion_api', { p_fecha: hoy, p_valor: 1460, p_fuente: 'test' })
    expect(Number((await e.client.rpc('cotizacion_vigente')).data)).toBe(1400)
    expect((await e.client.rpc('fijar_cotizacion_manual', { p_valor: 1 })).error?.message).toBe('NO_AUTORIZADO')
    expect((await d.client.rpc('fijar_cotizacion_manual', { p_valor: 0 })).error?.message).toBe('VALOR_INVALIDO')
    expect((await d.client.rpc('registrar_cotizacion_api', { p_fecha: hoy, p_valor: 1, p_fuente: 'x' })).error).not.toBeNull()
  })
})

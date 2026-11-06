import { beforeEach, describe, expect, it } from 'vitest'
import { admin, crearUsuario, limpiarOperaciones } from './helpers'

describe('turnos y caja', () => {
  beforeEach(async () => {
    await limpiarOperaciones()
  })

  it('flujo completo: apertura, movimientos, cierre a ciegas, corrección', async () => {
    const e1 = await crearUsuario('empleado')
    const e2 = await crearUsuario('empleado')
    const d = await crearUsuario('dueno')
    expect((await e1.client.rpc('fondo_sugerido')).data).toEqual([{ fondo_gs: 0, fondo_brl: 0 }])
    expect(
      (await e1.client.rpc('registrar_movimiento_caja', { p_sentido: 'salida', p_tipo: 'retiro', p_moneda: 'PYG', p_monto: 1, p_motivo: 'x' })).error?.message,
    ).toBe('SIN_TURNO_ABIERTO')
    expect((await e1.client.rpc('abrir_turno', { p_fondo_gs: -1, p_fondo_brl: 0 })).error?.message).toBe('VALOR_INVALIDO')
    expect((await e1.client.rpc('abrir_turno', { p_fondo_gs: 0, p_fondo_brl: 1.234 })).error?.message).toBe('VALOR_INVALIDO')
    const t = (await e1.client.rpc('abrir_turno', { p_fondo_gs: 600000, p_fondo_brl: 0 })).data!
    expect((await e2.client.rpc('abrir_turno', { p_fondo_gs: 0, p_fondo_brl: 0 })).error?.message).toBe('TURNO_YA_ABIERTO')
    const ta = (await e2.client.rpc('turno_actual')).data!
    expect(ta[0]).toMatchObject({ id: t, empleado_id: e1.id })
    expect(Object.keys(ta[0]).sort()).toEqual(['abierto_at', 'empleado_id', 'empleado_nombre', 'id'])
    const mc = (args: object) => e1.client.rpc('registrar_movimiento_caja', args as never)
    expect((await mc({ p_sentido: 'salida', p_tipo: 'retiro', p_moneda: 'PYG', p_monto: 530000, p_motivo: 'Retiro dueño' })).error).toBeNull()
    expect((await mc({ p_sentido: 'entrada', p_tipo: 'aporte_cambio', p_moneda: 'PYG', p_monto: 50000, p_motivo: 'cambio' })).error).toBeNull()
    expect((await mc({ p_sentido: 'entrada', p_tipo: 'retiro', p_moneda: 'PYG', p_monto: 1, p_motivo: 'x' })).error?.message).toBe('VALOR_INVALIDO')
    expect((await mc({ p_sentido: 'salida', p_tipo: 'otro', p_moneda: 'PYG', p_monto: 1, p_motivo: '' })).error?.message).toBe('MOTIVO_REQUERIDO')
    expect((await mc({ p_sentido: 'salida', p_tipo: 'otro', p_moneda: 'PYG', p_monto: 1.5, p_motivo: 'x' })).error?.message).toBe('VALOR_INVALIDO')
    expect((await mc({ p_sentido: 'salida', p_tipo: 'otro', p_moneda: 'BRL', p_monto: 1.234, p_motivo: 'x' })).error?.message).toBe('VALOR_INVALIDO')
    expect((await mc({ p_sentido: 'salida', p_tipo: 'otro', p_moneda: 'PYG', p_monto: 0, p_motivo: 'x' })).error?.message).toBe('VALOR_INVALIDO')
    expect((await e2.client.rpc('registrar_movimiento_caja', { p_sentido: 'salida', p_tipo: 'otro', p_moneda: 'PYG', p_monto: 1, p_motivo: 'x' })).error?.message).toBe('NO_AUTORIZADO')
    expect((await e2.client.rpc('cerrar_turno', { p_turno_id: t, p_contado_gs: 0, p_contado_brl: 0 })).error?.message).toBe('NO_AUTORIZADO')
    expect((await e1.client.rpc('resumen_turno', { p_turno_id: t })).error?.message).toBe('NO_AUTORIZADO')
    expect((await e1.client.rpc('_resumen_turno', { p_turno_id: t } as never)).error).not.toBeNull()
    expect((await e1.client.rpc('cerrar_turno', { p_turno_id: t, p_contado_gs: -1, p_contado_brl: 0 })).error?.message).toBe('VALOR_INVALIDO')
    const r = (await e1.client.rpc('cerrar_turno', { p_turno_id: t, p_contado_gs: 115000, p_contado_brl: 0 })).data!
    expect(r).toMatchObject({ esperado_gs: 120000, contado_gs: 115000, diferencia_gs: -5000 })
    expect(Number(r.esperado_brl)).toBe(0)
    expect(Number(r.diferencia_brl)).toBe(0)
    expect((await e1.client.rpc('cerrar_turno', { p_turno_id: t, p_contado_gs: 1, p_contado_brl: 0 })).error?.message).toBe('TURNO_CERRADO')
    // movimiento tras el cierre no se adjunta al turno cerrado
    expect((await mc({ p_sentido: 'salida', p_tipo: 'otro', p_moneda: 'PYG', p_monto: 1, p_motivo: 'tarde' })).error?.message).toBe('SIN_TURNO_ABIERTO')
    expect((await e1.client.rpc('fondo_sugerido')).data).toEqual([{ fondo_gs: 115000, fondo_brl: 0 }])
    // corrección
    expect((await e1.client.rpc('corregir_conteo', { p_turno_id: t, p_contado_gs: 120000, p_contado_brl: 0, p_motivo: 'x' })).error?.message).toBe('NO_AUTORIZADO')
    expect((await d.client.rpc('corregir_conteo', { p_turno_id: t, p_contado_gs: 120000, p_contado_brl: 0, p_motivo: ' ' })).error?.message).toBe('MOTIVO_REQUERIDO')
    expect((await d.client.rpc('corregir_conteo', { p_turno_id: t, p_contado_gs: 120000, p_contado_brl: 0, p_motivo: 'recontado' })).error).toBeNull()
    expect((await d.client.rpc('resumen_turno', { p_turno_id: t })).data).toMatchObject({ diferencia_gs: 0 })
    expect((await admin.from('correcciones_conteo').select().eq('turno_id', t)).data![0]).toMatchObject({
      contado_gs_anterior: 115000,
      contado_gs_nuevo: 120000,
      dueno_id: d.id,
    })
    // cierre forzado por dueño + corrección sobre turno abierto
    const t2 = (await e2.client.rpc('abrir_turno', { p_fondo_gs: 0, p_fondo_brl: 0 })).data!
    expect((await d.client.rpc('corregir_conteo', { p_turno_id: t2, p_contado_gs: 0, p_contado_brl: 0, p_motivo: 'x' })).error?.message).toBe('TURNO_ABIERTO')
    await d.client.rpc('cerrar_turno', { p_turno_id: t2, p_contado_gs: 0, p_contado_brl: 0 })
    expect((await admin.from('turnos').select('cerrado_por').eq('id', t2).single()).data!.cerrado_por).toBe(d.id)
  })

  it('usuario inactivo no puede operar', async () => {
    const i = await crearUsuario('empleado', { activo: false })
    expect((await i.client.rpc('abrir_turno', { p_fondo_gs: 0, p_fondo_brl: 0 })).error?.message).toBe('NO_AUTORIZADO')
    expect((await i.client.rpc('turno_actual')).error?.message).toBe('NO_AUTORIZADO')
    expect((await i.client.rpc('fondo_sugerido')).error?.message).toBe('NO_AUTORIZADO')
  })
})

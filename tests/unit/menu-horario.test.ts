import { describe, expect, test } from 'vitest'
import { estadoNegocio, filasHorario } from '@/lib/menu/horario'
import type { Horarios } from '@/lib/admin/horarios'

const H: Horarios = { lun: null, mar: null, mie: null, jue: null, vie: { abre: '18:00', cierra: '02:00' }, sab: { abre: '17:00', cierra: '23:00' }, dom: null }
describe('horario del menú', () => {
  test('viernes 20:00 abierto', () => expect(estadoNegocio(H, new Date('2026-11-06T23:00:00Z'))).toEqual({ abierto: true, cierra: '02:00' }))
  test('sábado 01:00 sigue abierto por el viernes', () => expect(estadoNegocio(H, new Date('2026-11-07T04:00:00Z'))).toEqual({ abierto: true, cierra: '02:00' }))
  test('sábado 02:30 cerrado, abre sábado 17:00', () => expect(estadoNegocio(H, new Date('2026-11-07T05:30:00Z'))).toEqual({ abierto: false, abre: { dia: 'sab', hora: '17:00' } }))
  test('límites de apertura y cierre y próxima semana', () => {
    expect(estadoNegocio(H, new Date('2026-11-07T05:00:00Z'))).toEqual({ abierto: false, abre: { dia: 'sab', hora: '17:00' } })
    expect(estadoNegocio(H, new Date('2026-11-06T21:00:00Z'))).toEqual({ abierto: true, cierra: '02:00' })
    expect(estadoNegocio(H, new Date('2026-11-08T03:00:00Z'))).toEqual({ abierto: false, abre: { dia: 'vie', hora: '18:00' } })
  })
  test('sin horarios', () => expect(estadoNegocio(null, new Date())).toEqual({ abierto: false, abre: null }))
  test('filas', () => {
    expect(filasHorario(H)).toHaveLength(7)
    expect(filasHorario(H)[4]).toEqual({ dia: 'Viernes', texto: '18:00 – 02:00' })
    expect(filasHorario(H)[0]).toEqual({ dia: 'Lunes', texto: 'Cerrado' })
    expect(filasHorario(null)).toEqual([])
  })
})

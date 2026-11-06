import { describe, expect, it } from 'vitest'
import { seccionActiva } from '@/lib/menu/scroll-spy'

describe('seccionActiva', () => {
  it('avanza al bajar y vuelve a la sección anterior al subir', () => {
    const posiciones = (tops: number[]) => tops.map((top, i) => ({ id: String(i + 1), top }))
    expect(seccionActiva(posiciones([140, 250, 360]), 140)).toBe('1')
    expect(seccionActiva(posiciones([20, 130, 240]), 140)).toBe('2')
    expect(seccionActiva(posiciones([-100, 10, 120]), 140)).toBe('3')
    expect(seccionActiva(posiciones([20, 130, 240]), 140)).toBe('2')
    expect(seccionActiva(posiciones([140, 250, 360]), 140)).toBe('1')
  })

  it('activa la sección al llegar a su posición de anclaje', () => {
    expect(seccionActiva([{ id: 'a', top: -100 }, { id: 'b', top: 144 }, { id: 'c', top: 300 }], 124)).toBe('b')
  })

  it('elige la primera sección antes de llegar a ella y no elige ninguna si está vacío', () => {
    expect(seccionActiva([{ id: 'a', top: 200 }, { id: 'b', top: 300 }], 140)).toBe('a')
    expect(seccionActiva([], 140)).toBeUndefined()
  })
})

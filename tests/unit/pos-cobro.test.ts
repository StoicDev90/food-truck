import { describe, expect, it } from 'vitest'
import { equivalenteBrl, previewCobro } from '../../lib/pos/cobro'

describe('cobro', () => {
  it('calcula el equivalente en reales', () => {
    expect(equivalenteBrl(31000, 1450)).toBe(21.38)
  })
  it('calcula el equivalente y el vuelto como la base de datos', () => {
    expect(previewCobro(31000, 'efectivo_brl', 50, 1450)).toEqual({ equivalenteGs: 72500, vueltoGs: 41500, alcanza: true })
    expect(previewCobro(31060, 'efectivo_gs', 50000, null)).toEqual({ equivalenteGs: 50000, vueltoGs: 18900, alcanza: true })
    expect(previewCobro(31040, 'efectivo_gs', 50000, null).vueltoGs).toBe(19000)
    expect(previewCobro(31000, 'efectivo_gs', 20000, null).alcanza).toBe(false)
    expect(previewCobro(31000, 'tarjeta', null, null)).toEqual({ equivalenteGs: 31000, vueltoGs: 0, alcanza: true })
  })
})

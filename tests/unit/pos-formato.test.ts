import { describe, expect, it } from 'vitest'
import { formatoBrl, formatoGs, parseMontoBrl, parseMontoGs } from '../../lib/pos/formato'

describe('formato de montos', () => {
  it('formatea guaraníes y reales', () => {
    expect(formatoGs(31000)).toBe('₲ 31.000'); expect(formatoGs(0)).toBe('₲ 0')
    expect(formatoBrl(21.379)).toBe('R$ 21,38'); expect(formatoBrl(50)).toBe('R$ 50,00')
  })
  it('interpreta montos válidos y rechaza montos inválidos', () => {
    expect(parseMontoGs('31.000')).toBe(31000); expect(parseMontoGs('₲ 100000')).toBe(100000)
    expect(parseMontoGs('abc')).toBeNull(); expect(parseMontoGs('1,5')).toBeNull(); expect(parseMontoGs('-5')).toBeNull()
    expect(parseMontoBrl('50,5')).toBe(50.5); expect(parseMontoBrl('R$ 50')).toBe(50); expect(parseMontoBrl('1.234,56')).toBe(1234.56)
    expect(parseMontoBrl('1,234')).toBeNull(); expect(parseMontoBrl('')).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import { CODIGOS_ERROR, MENSAJES_ERROR, codigoDeError } from '@/lib/errores'

describe('errores', () => {
  it('reconoce códigos y descarta el resto', () => {
    expect(codigoDeError({ message: 'STOCK_INSUFICIENTE' })).toBe('STOCK_INSUFICIENTE')
    expect(codigoDeError({ message: 'duplicate key value' })).toBeNull()
    expect(codigoDeError(null)).toBeNull()
  })
  it('todo código tiene mensaje', () => {
    for (const c of CODIGOS_ERROR) expect(MENSAJES_ERROR[c]).toBeTruthy()
  })
})

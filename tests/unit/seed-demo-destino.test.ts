import { describe, expect, it } from 'vitest'
import { destinoPermitido } from '../../scripts/seed-demo-destino'

describe('destinoPermitido', () => {
  const ref = 'abcdefghijklmnopqrst'

  it.each(['http://localhost:54321', 'http://127.0.0.1:54321'])('permite %s sin referencia remota', (url) => {
    expect(destinoPermitido(url, null)).toBe(true)
  })

  it('rechaza Supabase en la nube sin referencia', () => {
    expect(destinoPermitido(`https://${ref}.supabase.co`, null)).toBe(false)
  })

  it('permite la referencia remota coincidente con HTTPS', () => {
    expect(destinoPermitido(`https://${ref}.supabase.co`, ref)).toBe(true)
  })

  it('rechaza una referencia distinta', () => {
    expect(destinoPermitido(`https://${ref}.supabase.co`, 'zyxwvutsrqponmlkjihg')).toBe(false)
  })

  it('rechaza HTTP para destinos remotos', () => {
    expect(destinoPermitido(`http://${ref}.supabase.co`, ref)).toBe(false)
  })

  it.each(['', 'ABCDefghijklmnopqrst', 'abc', 'abcdefghijklmnopqrs-'])('rechaza la referencia inválida %s', (invalida) => {
    expect(destinoPermitido(`https://${invalida}.supabase.co`, invalida)).toBe(false)
  })

  it('rechaza una URL local con referencia remota', () => {
    expect(destinoPermitido('http://localhost:54321', ref)).toBe(false)
  })
})

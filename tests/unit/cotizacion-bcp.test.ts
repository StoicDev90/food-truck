vi.mock('server-only', () => ({}))
import { afterEach, expect, it, vi } from 'vitest'
import fixture from '../fixtures/allratestoday-bcp.json'
import { obtenerCotizacionBcp, validarCotizacion, URL_COTIZACION } from '@/lib/cotizacion/bcp'
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers() })
it('valida la publicación y admite hasta cinco días aunque stale sea true', () => {
  expect(validarCotizacion(fixture, '2026-11-06')).toEqual({ valor: 1168.08, fechaPublicacion: '2026-11-05' })
  expect(validarCotizacion({ ...fixture, rate_date: '2026-11-02', stale: true }, '2026-11-06')).not.toBeNull()
  for (const cambio of [{ derived: true }, { rate_date: '2026-10-31' }, { rate_date: '2026-11-07' }, { rate_date: '2026-02-30' }, { source: 'USD' }, { rate: 45 }, { bank: 'otro' }, { target: 'USD' }]) expect(validarCotizacion({ ...fixture, ...cambio }, '2026-11-06')).toBeNull()
  expect(validarCotizacion({ ...fixture, rate: 1168.086 }, '2026-11-06')?.valor).toBe(1168.09)
})
it('envía autorización y valida la respuesta', async () => {
  vi.stubEnv('ALLRATES_API_KEY', 'clave-prueba'); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-06T12:00:00Z'))
  const f = vi.fn().mockResolvedValue(new Response(JSON.stringify(fixture), { status: 200 }))
  expect(await obtenerCotizacionBcp(f)).toEqual({ valor: 1168.08, fechaPublicacion: '2026-11-05' })
  expect(f).toHaveBeenCalledWith(URL_COTIZACION, expect.objectContaining({ headers: { Authorization: 'Bearer clave-prueba' }, signal: expect.any(AbortSignal) }))
})
it('devuelve null ante fallas y ausencia de clave', async () => {
  vi.stubEnv('ALLRATES_API_KEY', 'clave-prueba')
  for (const status of [403, 429, 500]) expect(await obtenerCotizacionBcp(vi.fn().mockResolvedValue(new Response('', { status })))).toBeNull()
  expect(await obtenerCotizacionBcp(vi.fn().mockRejectedValue(new Error('red')))).toBeNull()
  expect(await obtenerCotizacionBcp(vi.fn().mockRejectedValue(new DOMException('timeout', 'TimeoutError')))).toBeNull()
  expect(await obtenerCotizacionBcp(vi.fn().mockResolvedValue(new Response('invalido')))).toBeNull()
  vi.stubEnv('ALLRATES_API_KEY', '')
  const f = vi.fn(); expect(await obtenerCotizacionBcp(f)).toBeNull(); expect(f).not.toHaveBeenCalled()
})

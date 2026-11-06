import { beforeEach, afterEach, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({ obtener: vi.fn(), admin: vi.fn(), rpc: vi.fn(), hoy: vi.fn() }))
vi.mock('@/lib/cotizacion/bcp', () => ({ obtenerCotizacionBcp: m.obtener }))
vi.mock('@/lib/supabase/admin', () => ({ crearClienteAdmin: m.admin }))
vi.mock('@/lib/admin/fechas', () => ({ hoyPy: m.hoy }))
import { GET } from '@/app/api/cron/cotizacion/route'
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv('CRON_SECRET', 'secreto-prueba'); m.admin.mockReturnValue({ rpc: m.rpc }); m.hoy.mockReturnValue('2026-11-06') })
afterEach(() => vi.unstubAllEnvs())
const request = (auth?: string) => new Request('http://localhost/api/cron/cotizacion', { headers: auth ? { authorization: auth } : {} })
it('rechaza antes de consultar o crear cliente, incluso sin secreto configurado', async () => {
  expect((await GET(request())).status).toBe(401); expect(m.admin).not.toHaveBeenCalled(); expect(m.obtener).not.toHaveBeenCalled()
  vi.stubEnv('CRON_SECRET', ''); expect((await GET(request('Bearer '))).status).toBe(401)
})
it('no escribe si no hay cotización', async () => {
  m.obtener.mockResolvedValue(null); expect((await GET(request('Bearer secreto-prueba'))).status).toBe(502); expect(m.rpc).not.toHaveBeenCalled()
})
it('guarda para hoy con fuente y devuelve resultado', async () => {
  m.obtener.mockResolvedValue({ valor: 1168.08, fechaPublicacion: '2026-11-05' }); m.rpc.mockResolvedValue({ error: null })
  const r = await GET(request('Bearer secreto-prueba'))
  expect(r.status).toBe(200); expect(await r.json()).toEqual({ fecha: '2026-11-06', valor: 1168.08, fechaPublicacion: '2026-11-05' })
  expect(m.rpc).toHaveBeenCalledWith('registrar_cotizacion_api', { p_fecha: '2026-11-06', p_valor: 1168.08, p_fuente: 'BCP 2026-11-05 (AllRatesToday)' })
})
it('informa error de escritura', async () => { m.obtener.mockResolvedValue({ valor: 1168, fechaPublicacion: '2026-11-05' }); m.rpc.mockResolvedValue({ error: {} }); expect((await GET(request('Bearer secreto-prueba'))).status).toBe(500) })

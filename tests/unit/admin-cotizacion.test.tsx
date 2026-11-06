import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({ acceso: vi.fn(), rpc: vi.fn(), refresh: vi.fn() }))
vi.mock('@/lib/auth/sesion', () => ({ requerirAcceso: m.acceso }))
vi.mock('@/lib/supabase/server', () => ({ crearClienteServidor: async () => ({ rpc: m.rpc }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: m.refresh }), unstable_rethrow: () => {} }))
import { fijarCotizacionManual } from '@/lib/admin/cotizacion'
import { FormCotizacion } from '@/components/admin/FormCotizacion'
beforeEach(() => { vi.resetAllMocks(); m.acceso.mockResolvedValue({}) })
afterEach(cleanup)
it('valida y guarda mediante sesión de dueño', async () => {
  for (const n of [0, -1, 1.234, NaN, Infinity]) expect(await fijarCotizacionManual(n)).toMatchObject({ ok: false, codigo: 'VALOR_INVALIDO' })
  expect(m.rpc).not.toHaveBeenCalled(); m.rpc.mockResolvedValue({ error: null })
  expect(await fijarCotizacionManual(1450.5)).toEqual({ ok: true, data: null })
  expect(m.rpc).toHaveBeenCalledWith('fijar_cotizacion_manual', { p_valor: 1450.5 }); expect(m.acceso).toHaveBeenCalledWith('admin')
})
it('el formulario convierte, envía una sola vez y actualiza', async () => {
  let resolver!: (v: { error: null }) => void
  m.rpc.mockReturnValue(new Promise(resolve => { resolver = resolve }))
  render(<FormCotizacion />)
  fireEvent.change(screen.getByLabelText('Cotización'), { target: { value: '1.450,50' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  await act(async () => { await Promise.resolve() })
  fireEvent.submit(screen.getByRole('button', { name: 'Guardando…' }).closest('form')!)
  expect(m.rpc).toHaveBeenCalledOnce(); expect(m.rpc).toHaveBeenCalledWith('fijar_cotizacion_manual', { p_valor: 1450.5 })
  await act(async () => resolver({ error: null })); expect(m.refresh).toHaveBeenCalledOnce()
})
it.each(['0', 'abc'])('rechaza %s en el formulario', value => {
  render(<FormCotizacion />); fireEvent.change(screen.getByLabelText('Cotización'), { target: { value } }); fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(screen.getByRole('alert')).toBeInTheDocument(); expect(m.rpc).not.toHaveBeenCalled()
})

it('muestra la vigente manual, la fuente, el responsable y el historial', async () => {
  const order = vi.fn().mockResolvedValue({ data: [{ fecha: '2026-11-06', valor_api: 1168.08, valor_manual: 1450.5, fuente: 'BCP 2026-11-05 (AllRatesToday)', actualizado_por: '1', updated_at: '2026-11-06T15:00:00Z', perfiles: { nombre: 'Ana' } }], error: null })
  const lte = vi.fn(() => ({ order })); const gte = vi.fn(() => ({ lte }))
  const from = vi.fn(() => ({ select: () => ({ gte }) }))
  vi.doMock('@/lib/supabase/server', () => ({ crearClienteServidor: async () => ({ from }) }))
  vi.doMock('@/lib/admin/fechas', async importOriginal => ({ ...(await importOriginal<typeof import('@/lib/admin/fechas')>()), hoyPy: () => '2026-11-06' }))
  const { default: Page } = await import('@/app/admin/(protegido)/cotizacion/page')
  render(await Page())
  expect(m.acceso).toHaveBeenCalledWith('admin'); expect(gte).toHaveBeenCalledWith('fecha', '2026-10-24'); expect(lte).toHaveBeenCalledWith('fecha', '2026-11-06')
  expect(screen.getByText(/Vigente:/)).toHaveTextContent('1.450,50'); expect(screen.getByText(/API:/)).toHaveTextContent('BCP 2026-11-05 (AllRatesToday)')
  expect(screen.getByText(/Manual:/)).toHaveTextContent('Ana'); expect(screen.getByText(/Última actualización/)).toHaveTextContent('06/11 12:00')
  expect(screen.getByRole('heading', { name: 'Historial de 14 días' })).toBeInTheDocument()
})

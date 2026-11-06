import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({ rpc: vi.fn(), acceso: vi.fn() }))
vi.mock('@/lib/auth/sesion', () => ({ requerirAcceso: m.acceso }))
vi.mock('@/lib/supabase/server', () => ({ crearClienteServidor: async () => ({ rpc: m.rpc }) }))

import Ventas from '@/app/admin/(protegido)/reportes/ventas/page'
import MasVendidos from '@/app/admin/(protegido)/reportes/mas-vendidos/page'
import Anulaciones from '@/app/admin/(protegido)/reportes/anulaciones/page'

const params = () => ({ searchParams: Promise.resolve({ desde: '2026-11-01', hasta: '2026-11-06' }) })
afterEach(() => { cleanup(); vi.resetAllMocks() })

it('distingue ganancia sin costo, parcial y completa por producto', async () => {
  m.rpc.mockResolvedValue({ data: [
    { producto_id: '1', nombre: 'Pancho', cantidad: '2', total_gs: '20000', ganancia_gs: null, unidades_sin_costo: '2' },
    { producto_id: '2', nombre: 'Hamburguesa', cantidad: '3', total_gs: '45000', ganancia_gs: '12000', unidades_sin_costo: '1' },
    { producto_id: '3', nombre: 'Papas', cantidad: '1', total_gs: '10000', ganancia_gs: '4000', unidades_sin_costo: '0' },
  ], error: null })
  render(await MasVendidos(params()))
  expect(within(screen.getByText('Pancho').closest('tr')!).getByText('Sin costo')).toBeInTheDocument()
  expect(within(screen.getByText('Hamburguesa').closest('tr')!).getByText('₲ 12.000 (parcial)')).toBeInTheDocument()
  expect(within(screen.getByText('Papas').closest('tr')!).getByText('₲ 4.000')).toBeInTheDocument()
})

it('muestra un marcador cuando no se conoce quién anuló la venta', async () => {
  m.rpc.mockResolvedValue({ data: [{ venta_id: '1', anulada_at: '2026-11-06T12:00:00Z', total_gs: '31000', medio: 'efectivo_gs', empleado_nombre: 'Ana', anulada_por_nombre: null, motivo: 'Error' }], error: null })
  render(await Anulaciones(params()))
  const fila = screen.getByText('Ana').closest('tr')!
  expect(within(fila).getByText('—')).toBeInTheDocument()
  expect(within(fila).getByText('Error')).toBeInTheDocument()
})

it.each([
  ['ventas', Ventas, 'reporte_ventas'],
  ['más vendidos', MasVendidos, 'reporte_mas_vendidos'],
  ['anulaciones', Anulaciones, 'reporte_anulaciones'],
] as const)('muestra el error del RPC en %s', async (_nombre, Page, rpc) => {
  m.rpc.mockResolvedValue({ data: null, error: { message: 'NO_AUTORIZADO' } })
  render(await Page(params()))
  expect(m.rpc).toHaveBeenCalledWith(rpc, { p_desde: '2026-11-01', p_hasta: '2026-11-06' })
  expect(screen.getByRole('alert')).toHaveTextContent('No tenés permiso para realizar esta acción.')
})

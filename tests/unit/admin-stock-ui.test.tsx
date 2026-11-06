import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({ ingreso: vi.fn(), ajuste: vi.fn(), refresh: vi.fn(), acceso: vi.fn(), from: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: m.refresh }) }))
vi.mock('@/lib/admin/stock', () => ({ ingresarStock: m.ingreso, ajustarStock: m.ajuste }))
vi.mock('@/lib/auth/sesion', () => ({ requerirAcceso: m.acceso }))
vi.mock('@/lib/supabase/server', () => ({ crearClienteServidor: async () => ({ from: m.from }) }))
import { FormMovimientoStock } from '@/components/admin/FormMovimientoStock'
import Page from '@/app/admin/(protegido)/stock/page'

beforeEach(() => { vi.resetAllMocks(); m.acceso.mockResolvedValue({}) })
afterEach(cleanup)

it('registra un ingreso, bloquea envíos repetidos y actualiza la página al terminar', async () => {
  let resolver!: (value: { ok: true; data: { stock: number } }) => void
  m.ingreso.mockReturnValue(new Promise(resolve => { resolver = resolve }))
  render(<FormMovimientoStock productoId="pan" />)
  expect(screen.getByLabelText('Motivo (opcional)')).not.toBeRequired()
  fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '3' } })
  fireEvent.change(screen.getByLabelText('Motivo (opcional)'), { target: { value: 'compra' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled()
  fireEvent.submit(screen.getByRole('button', { name: 'Guardando…' }).closest('form')!)
  expect(m.ingreso).toHaveBeenCalledOnce()
  expect(m.ingreso).toHaveBeenCalledWith('pan', 3, 'compra')
  expect(m.ajuste).not.toHaveBeenCalled()
  await act(async () => resolver({ ok: true, data: { stock: 7 } }))
  expect(screen.getByRole('status')).toHaveTextContent('Stock actualizado: 7')
  expect(screen.getByLabelText('Cantidad')).toHaveValue('')
  expect(screen.getByLabelText('Motivo (opcional)')).toHaveValue('')
  expect(m.refresh).toHaveBeenCalledOnce()
})

it('exige motivo para ajustes y envía cantidades con signo', async () => {
  m.ajuste.mockResolvedValue({ ok: true, data: { stock: 2 } })
  render(<FormMovimientoStock productoId="pan" />)
  fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'ajuste' } })
  const motivo = screen.getByLabelText('Motivo (obligatorio)')
  expect(motivo).toBeRequired()
  fireEvent.change(screen.getByLabelText('Cantidad (positiva o negativa)'), { target: { value: '-2' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(m.ajuste).not.toHaveBeenCalled()
  fireEvent.change(motivo, { target: { value: 'conteo' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  await waitFor(() => expect(m.ajuste).toHaveBeenCalledWith('pan', -2, 'conteo'))
  expect(m.ingreso).not.toHaveBeenCalled()
  expect(m.refresh).toHaveBeenCalledOnce()
})

const productos = [{ id: 'pan', nombre: 'Pan', stock: 4, controla_stock: true }, { id: 'agua', nombre: 'Agua', stock: 0, controla_stock: false }, { id: 'salsa', nombre: 'Salsa', stock: 2, controla_stock: true }]
function prepararDb() {
  const productoEq = vi.fn((_col: string, control: boolean) => ({ order: async () => ({ data: productos.filter(p => p.controla_stock === control), error: null }) }))
  const movimientoLimit = vi.fn(async () => ({ data: [
    { id: '1', created_at: '2026-11-06T17:05:00Z', tipo: 'ingreso', cantidad: 3, motivo: 'Compra', perfiles: { nombre: 'Ana' } },
    { id: '2', created_at: '2026-11-06T16:05:00Z', tipo: 'ajuste', cantidad: -2, motivo: null, perfiles: null },
  ], error: null }))
  const movimientoEq = vi.fn(() => ({ order: () => ({ limit: movimientoLimit }) }))
  m.from.mockImplementation((tabla: string) => tabla === 'productos'
    ? { select: () => ({ eq: productoEq }) }
    : { select: () => ({ eq: movimientoEq }) })
  return { productoEq, movimientoEq, movimientoLimit }
}

it('preselecciona el producto del URL y muestra su historial', async () => {
  const db = prepararDb()
  render(await Page({ searchParams: Promise.resolve({ producto: 'pan' }) }))
  expect(m.acceso).toHaveBeenCalledWith('admin')
  expect(db.productoEq).toHaveBeenCalledWith('controla_stock', true)
  expect(screen.getByRole('link', { name: /Pan\s*Stock: 4/ })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByRole('link', { name: /Salsa\s*Stock: 2/ })).toHaveAttribute('href', '/admin/stock?producto=salsa')
  expect(screen.queryByText('Agua')).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Pan · Stock: 4' })).toBeInTheDocument()
  expect(db.movimientoEq).toHaveBeenCalledWith('producto_id', 'pan')
  expect(db.movimientoLimit).toHaveBeenCalledWith(200)
  const filas = screen.getAllByRole('row')
  expect(within(filas[1]).getAllByRole('cell').map(c => c.textContent)).toEqual(['06/11 14:05', 'ingreso', '+3', 'Compra', 'Ana'])
  expect(within(filas[2]).getAllByRole('cell').map(c => c.textContent)).toEqual(['06/11 13:05', 'ajuste', '-2', '—', '—'])
})

it.each([undefined, 'desconocido', 'agua'])('no selecciona un producto ausente, desconocido o sin control (%s)', async producto => {
  prepararDb()
  render(await Page({ searchParams: Promise.resolve({ producto }) }))
  expect(screen.queryByRole('heading', { name: 'Registrar movimiento' })).not.toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Historial' })).not.toBeInTheDocument()
  expect(m.from).not.toHaveBeenCalledWith('movimientos_stock')
})

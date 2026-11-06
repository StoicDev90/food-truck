import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({ crear: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/lib/admin/catalogo', () => ({ crearProducto: m.crear, editarProducto: vi.fn() }))
vi.mock('@/components/admin/SubirImagen', () => ({ SubirImagen: () => null }))
import { FormProducto } from '@/components/admin/FormProducto'
afterEach(cleanup)
const id = '123e4567-e89b-42d3-a456-426614174000'
it('convierte precio, costo vacío y bloquea doble envío', async () => {
  m.crear.mockReturnValue(new Promise(() => {}))
  render(<FormProducto categorias={[{ id, nombre: 'Comida' }]} />)
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Pan' } })
  fireEvent.change(screen.getByLabelText('Precio'), { target: { value: '8.000' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' })); fireEvent.submit(screen.getByRole('button', { name: 'Guardando…' }).closest('form')!)
  await waitFor(() => expect(m.crear).toHaveBeenCalledTimes(1))
  expect(m.crear.mock.calls[0][0]).toMatchObject({ precioGs: 8000, costoGs: null })
})
it('muestra error para precio decimal', () => {
  m.crear.mockClear(); render(<FormProducto categorias={[{ id, nombre: 'Comida' }]} />)
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Pan' } })
  fireEvent.change(screen.getByLabelText('Precio'), { target: { value: '8,5' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(screen.getByText('Precio inválido')).toBeInTheDocument(); expect(m.crear).not.toHaveBeenCalled()
})

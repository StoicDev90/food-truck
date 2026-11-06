import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({ crear: vi.fn(), upload: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/lib/admin/catalogo', () => ({ crearProducto: m.crear, editarProducto: vi.fn() }))
vi.mock('@/lib/supabase/client', () => ({ crearClienteNavegador: () => ({ storage: { from: () => ({ upload: m.upload }) } }) }))
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

it('espera la subida de la foto antes de guardar su ruta', async () => {
  m.crear.mockReset().mockResolvedValue({ ok: true, data: { id } })
  let terminar!: (value: { error: null }) => void
  m.upload.mockReturnValue(new Promise(resolve => { terminar = resolve }))
  render(<FormProducto categorias={[{ id, nombre: 'Comida' }]} />)
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Pan' } })
  fireEvent.change(screen.getByLabelText('Precio'), { target: { value: '8000' } })
  fireEvent.change(screen.getByLabelText('Foto'), { target: { files: [new File(['foto'], 'foto.png', { type: 'image/png' })] } })
  expect(screen.getByRole('button', { name: 'Subiendo foto…' })).toBeDisabled()
  expect(m.crear).not.toHaveBeenCalled()
  await act(async () => terminar({ error: null }))
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  await waitFor(() => expect(m.crear).toHaveBeenCalledOnce())
  expect(m.crear.mock.calls[0][0].fotoPath).toMatch(/^productos\/.*\.png$/)
})

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({ crear: vi.fn(), editar: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/lib/admin/catalogo', () => ({ crearCategoria: m.crear, editarCategoria: m.editar, borrarCategoria: vi.fn() }))
import { TablaCategorias } from '@/components/admin/TablaCategorias'
afterEach(() => { cleanup(); vi.clearAllMocks() })
it('agrega y guarda categorías desde sus botones', async () => {
  m.crear.mockResolvedValue({ ok: true }); m.editar.mockResolvedValue({ ok: true })
  render(<TablaCategorias categorias={[{ id: '1', nombre: 'Bebidas', orden: 1 }]} />)
  fireEvent.change(screen.getAllByLabelText('Nombre')[0], { target: { value: 'Comida' } })
  fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))
  await waitFor(() => expect(m.crear).toHaveBeenCalledOnce())
  expect(m.crear).toHaveBeenCalledWith('Comida', 0)
  fireEvent.change(screen.getAllByLabelText('Nombre')[1], { target: { value: 'Jugos' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  await waitFor(() => expect(m.editar).toHaveBeenCalledOnce())
  expect(m.editar).toHaveBeenCalledWith('1', 'Jugos', 1)
})

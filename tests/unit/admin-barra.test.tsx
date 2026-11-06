import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
vi.mock('next/navigation', () => ({ usePathname: () => '/admin/stock' }))
vi.mock('@/lib/auth/acciones', () => ({ cerrarSesion: vi.fn() }))
import { BarraLateral } from '@/components/admin/BarraLateral'
afterEach(cleanup)
test('muestra navegación, negocio y sesión', () => {
  render(<BarraLateral nombre="Oasis Itaipu" />)
  expect(screen.getByRole('link', { name: 'Stock' }).getAttribute('aria-current')).toBe('page')
  expect(screen.getByText('Oasis Itaipu')).toBeTruthy()
  expect(screen.getByText('Panel de dueños')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Abrir POS' }).getAttribute('href')).toBe('/pos')
})

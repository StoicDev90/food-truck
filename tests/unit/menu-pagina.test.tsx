import { afterEach, describe, expect, test, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import type { DatosMenu } from '@/lib/menu/armar'
import type { Horarios } from '@/lib/admin/horarios'
import Home from '@/app/page'
import { cargarMenu } from '@/lib/menu/datos'
import { EstadoAbierto } from '@/components/menu/EstadoAbierto'

vi.mock('@/lib/menu/datos', () => ({ cargarMenu: vi.fn() }))
const horarios: Horarios = { lun: null, mar: null, mie: null, jue: null, vie: { abre: '18:00', cierra: '02:00' }, sab: { abre: '17:00', cierra: '23:00' }, dom: null }
const menu: DatosMenu = { nombre: 'Oasis Itaipu', logoUrl: null, horarios, whatsapp: null, instagram: null, ubicacion: null, secciones: [{ id: 'comidas', nombre: 'Comidas', productos: [{ id: '1', nombre: 'Hamburguesa', descripcion: 'Casera', fotoUrl: null, precioGs: 8000, agotado: true }, { id: '2', nombre: 'Pizza', descripcion: null, fotoUrl: 'https://example.com/pizza.jpg', precioGs: 8000, agotado: false }] }, { id: 'bebidas', nombre: 'Bebidas', productos: [] }] }
afterEach(() => { cleanup(); vi.useRealTimers() })
async function pagina(datos: DatosMenu) { vi.mocked(cargarMenu).mockResolvedValue(datos); render(await Home()) }

describe('menú público', () => {
  test('productos, fotos, agotados y precios', async () => {
    await pagina(menu)
    expect(screen.getByText('AGOTADO')).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: 'Oasis Itaipu' }).some(el => el.parentElement?.className.includes('grayscale'))).toBe(true)
    expect(screen.getByRole('img', { name: 'Pizza' })).toHaveAttribute('src', 'https://example.com/pizza.jpg')
    expect(screen.getAllByText('₲ 8.000')).toHaveLength(2)
    expect(document.body).not.toHaveTextContent('R$')
  })
  test('pestañas por sección y menú vacío', async () => {
    await pagina(menu)
    expect(screen.getByRole('link', { name: 'Comidas' })).toHaveAttribute('href', '#cat-comidas')
    expect(screen.getByRole('link', { name: 'Bebidas' })).toHaveAttribute('href', '#cat-bebidas')
    cleanup(); await pagina({ ...menu, secciones: [] })
    expect(screen.getByText('Pronto vas a ver el menú acá.')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Categorías' })).not.toBeInTheDocument()
  })
  test('contactos opcionales', async () => {
    await pagina({ ...menu, horarios: null })
    expect(screen.getByText('Horario no disponible')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /WhatsApp|Instagram|Cómo llegar/ })).not.toBeInTheDocument()
    cleanup(); await pagina({ ...menu, whatsapp: '595981123456' })
    expect(screen.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', 'https://wa.me/595981123456')
  })
  test('estado actualizado en el cliente', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-06T23:00:00Z'))
    const { rerender } = render(<EstadoAbierto horarios={horarios} />)
    expect(screen.getByText('Abierto · cierra 02:00')).toBeInTheDocument()
    rerender(<EstadoAbierto horarios={null} />)
    expect(screen.getByText('Cerrado')).toBeInTheDocument()
    rerender(<EstadoAbierto horarios={horarios} />)
    vi.setSystemTime(new Date('2026-11-07T05:30:00Z'))
    act(() => vi.advanceTimersByTime(60000))
    expect(screen.getByText('Cerrado · abre sábado 17:00')).toBeInTheDocument()
  })
})

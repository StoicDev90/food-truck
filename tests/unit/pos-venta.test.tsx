import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PantallaVenta } from '@/components/pos/PantallaVenta'
import type { DatosPos } from '@/lib/pos/datos'

const mocks = vi.hoisted(() => ({ conexion: true, refresh: vi.fn() }))
vi.mock('@/lib/pos/useConexion', () => ({ useConexion: () => mocks.conexion }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }))
const datos: DatosPos = {
  perfil: { id: '1', nombre: 'Juan', rol: 'empleado', activo: true },
  turno: { id: 't', empleadoId: '1', empleadoNombre: 'Juan', abiertoAt: '2026-11-06T10:00:00Z' },
  categorias: [{ id: 'c', nombre: 'Comidas' }], cotizacion: 1450, fondoSugerido: { gs: 0, brl: 0 },
  productos: [
    { id: '1', categoriaId: 'c', nombre: 'Empanada de carne', precioGs: 8000, stock: 6, controlaStock: true },
    { id: '2', categoriaId: 'c', nombre: 'Pollo', precioGs: 5000, stock: 3, controlaStock: true },
    { id: '3', categoriaId: 'c', nombre: 'Agotado', precioGs: 1000, stock: 0, controlaStock: true },
  ],
}
afterEach(cleanup)
beforeEach(() => { mocks.conexion = true; mocks.refresh.mockClear() })
describe('pantalla de venta', () => {
  it('suma productos y muestra cantidades y totales', () => {
    render(<PantallaVenta datos={datos} />)
    const producto = screen.getByRole('button', { name: /Empanada de carne/ })
    fireEvent.click(producto); fireEvent.click(producto)
    expect(within(producto).getByText('2')).toBeInTheDocument()
    expect(screen.getAllByText('₲ 16.000').length).toBeGreaterThan(0)
    expect(screen.getByText('≈ R$ 11,03')).toBeInTheDocument()
  })
  it('muestra stock bajo y bloquea agotados', () => {
    render(<PantallaVenta datos={datos} />)
    expect(screen.getByRole('button', { name: /Agotado/ })).toBeDisabled()
    expect(screen.getByText('Sin stock')).toBeInTheDocument()
    expect(screen.getByText('quedan 3')).toBeInTheDocument()
    expect(within(screen.getByRole('button', { name: /Empanada/ })).queryByText(/quedan/)).not.toBeInTheDocument()
  })
  it('vacía el pedido y deshabilita cobrar', () => {
    render(<PantallaVenta datos={datos} />)
    fireEvent.click(screen.getByRole('button', { name: /Empanada/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Vaciar' }))
    expect(screen.getByRole('button', { name: 'COBRAR' })).toBeDisabled()
  })
  it('bloquea cobrar sin conexión', () => {
    mocks.conexion = false; render(<PantallaVenta datos={datos} />)
    fireEvent.click(screen.getByRole('button', { name: /Empanada/ }))
    expect(screen.getByText('Sin conexión')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'COBRAR' })).toBeDisabled()
  })
  it('indica falta de cotización', () => {
    render(<PantallaVenta datos={{ ...datos, cotizacion: null }} />)
    expect(screen.getByText('Sin cotización')).toBeInTheDocument()
    expect(screen.queryByText(/≈ R\$/)).not.toBeInTheDocument()
  })
  it('filtra al escribir y limpia con Escape', () => {
    render(<PantallaVenta datos={datos} />)
    for (const key of 'pollo') fireEvent.keyDown(document, { key })
    expect(screen.queryByRole('button', { name: /Empanada/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Pollo/ })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('button', { name: /Empanada/ })).toBeInTheDocument()
  })
  it('no filtra al escribir dentro de un input', () => {
    render(<><input aria-label="Otro campo" /><PantallaVenta datos={datos} /></>)
    const input = screen.getByLabelText('Otro campo'); input.focus()
    fireEvent.keyDown(input, { key: 'p' })
    expect(screen.getByRole('button', { name: /Empanada/ })).toBeInTheDocument()
  })
  it('ignora Enter y Escape dentro de un input', () => {
    const cobrar = vi.fn()
    render(<><input aria-label="Otro campo" /><PantallaVenta datos={datos} onCobrar={cobrar} /></>)
    fireEvent.click(screen.getByRole('button', { name: /Pollo/ }))
    fireEvent.keyDown(document, { key: 'p' })
    const input = screen.getByLabelText('Otro campo'); input.focus()
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(cobrar).not.toHaveBeenCalled()
    expect(screen.getByText('p', { selector: 'strong' })).toBeInTheDocument()
  })
  it('ignora los atajos mientras hay un diálogo abierto', () => {
    const cobrar = vi.fn()
    const { rerender } = render(<><PantallaVenta datos={datos} onCobrar={cobrar} /></>)
    fireEvent.click(screen.getByRole('button', { name: /Pollo/ }))
    fireEvent.keyDown(document, { key: 'p' })
    rerender(<><PantallaVenta datos={datos} onCobrar={cobrar} /><div role="dialog">Diálogo</div></>)
    for (const key of ['o', 'Enter', 'Escape']) fireEvent.keyDown(document, { key })
    expect(cobrar).not.toHaveBeenCalled()
    expect(screen.getByText('p', { selector: 'strong' })).toBeInTheDocument()
  })
  it('deja que Enter active un producto sin cobrar', () => {
    const cobrar = vi.fn()
    render(<PantallaVenta datos={datos} onCobrar={cobrar} />)
    fireEvent.click(screen.getByRole('button', { name: /Pollo/ }))
    const producto = screen.getByRole('button', { name: /Empanada/ }); producto.focus()
    // jsdom no implementa la activación predeterminada de botones por teclado.
    if (fireEvent.keyDown(producto, { key: 'Enter' })) fireEvent.click(producto)
    expect(within(producto).getByText('1')).toBeInTheDocument()
    expect(cobrar).not.toHaveBeenCalled()
  })
  it('no agrega espacios al filtro desde un botón ni desde la página', () => {
    render(<PantallaVenta datos={datos} />)
    fireEvent.keyDown(document, { key: 'p' })
    const producto = screen.getByRole('button', { name: /Pollo/ }); producto.focus()
    fireEvent.keyDown(producto, { key: ' ' })
    producto.blur()
    fireEvent.keyDown(document, { key: ' ' })
    expect(screen.getByText('p', { selector: 'strong' }).textContent).toBe('p')
  })
  it('Enter cobra y permite refrescar si no hay turno', () => {
    const cobrar = vi.fn(); render(<PantallaVenta datos={datos} onCobrar={cobrar} />)
    fireEvent.click(screen.getByRole('button', { name: /Empanada/ }))
    fireEvent.keyDown(document, { key: 'Enter' })
    expect(cobrar).toHaveBeenCalledOnce()
    cobrar.mock.calls[0][0].onSinTurno()
    expect(mocks.refresh).toHaveBeenCalledOnce()
  })
})

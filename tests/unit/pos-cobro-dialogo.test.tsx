import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DialogoCobro } from '@/components/pos/DialogoCobro'
import { registrarVenta } from '@/lib/pos/acciones'
import { MENSAJES_ERROR } from '@/lib/errores'

vi.mock('@/lib/pos/acciones', () => ({ registrarVenta: vi.fn() }))
const pedido = [{ productoId: 'p1', nombre: 'Comida', precioGs: 31000, cantidad: 1 }]
const callbacks = () => ({ onCerrar: vi.fn(), onVendido: vi.fn(), onSinTurno: vi.fn() })
function abrir(cotizacion: number | null = 1450) {
  const props = callbacks()
  render(<DialogoCobro abierto pedido={pedido} cotizacion={cotizacion} {...props} />)
  return props
}
function transferencia() { fireEvent.click(screen.getByRole('button', { name: /Transferencia/ })) }

beforeEach(() => vi.resetAllMocks())
afterEach(() => { cleanup(); vi.useRealTimers() })
describe('diálogo de cobro', () => {
  it('selecciona los cuatro medios con el teclado', () => {
    abrir()
    for (const [key, name] of [['1', 'Efectivo ₲'], ['2', 'Efectivo R$'], ['3', 'Transferencia'], ['4', 'Tarjeta']]) {
      fireEvent.keyDown(document, { key })
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'true')
    }
  })
  it('calcula equivalente y vuelto en reales y permite cargar el exacto', () => {
    abrir(); fireEvent.click(screen.getByRole('button', { name: 'Efectivo R$' }))
    fireEvent.click(screen.getByRole('button', { name: 'R$ 50' }))
    expect(screen.getByText('= ₲ 72.500')).toBeInTheDocument()
    expect(screen.getByText('₲ 41.500')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Exacto' }))
    expect(screen.getByLabelText(/Recibido/)).toHaveValue('21,38')
  })
  it('Exacto en reales cubre el total cuando hay que redondear hacia arriba', () => {
    abrir(1500); fireEvent.click(screen.getByRole('button', { name: 'Efectivo R$' }))
    fireEvent.click(screen.getByRole('button', { name: 'Exacto' }))
    expect(screen.getByLabelText(/Recibido/)).toHaveValue('20,67')
    expect(screen.getByRole('button', { name: 'CONFIRMAR' })).toBeEnabled()
  })
  it('deshabilita el pago insuficiente', () => {
    abrir(); fireEvent.change(screen.getByLabelText(/Recibido/), { target: { value: '20000' } })
    expect(screen.getByText('Falta ₲ 11.000')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'CONFIRMAR' })).toBeDisabled()
  })
  it('explica la falta de cotización', () => {
    abrir(null)
    expect(screen.getByRole('button', { name: /Efectivo R\$/ })).toBeDisabled()
    expect(screen.getByText('sin cotización')).toBeInTheDocument()
  })
  it('pide confirmación de transferencia', () => {
    abrir(); transferencia()
    expect(screen.getByText('¿Entró el pago de ₲ 31.000?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sí, confirmar' })).toBeEnabled()
  })
  it.each(['click', 'enter'])('bloquea eventos repetidos: %s', tipo => {
    vi.mocked(registrarVenta).mockReturnValue(new Promise(() => {}))
    abrir(); transferencia()
    const boton = screen.getByRole('button', { name: 'Sí, confirmar' })
    act(() => {
      if (tipo === 'click') { boton.click(); boton.click() }
      else { fireEvent.keyDown(document, { key: 'Enter' }); fireEvent.keyDown(document, { key: 'Enter' }) }
    })
    expect(registrarVenta).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: /Registrando…/ })).toBeDisabled()
  })
  it('permite reintentar un error con la misma clave', async () => {
    vi.mocked(registrarVenta).mockResolvedValue({ ok: false, codigo: null, error: 'No se pudo completar. Probá de nuevo.' })
    abrir(); transferencia(); fireEvent.click(screen.getByRole('button', { name: 'Sí, confirmar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo completar')
    fireEvent.click(screen.getByRole('button', { name: 'Sí, confirmar' }))
    await waitFor(() => expect(registrarVenta).toHaveBeenCalledTimes(2))
    expect(vi.mocked(registrarVenta).mock.calls[0][0].clave).toBe(vi.mocked(registrarVenta).mock.calls[1][0].clave)
  })
  it('conserva el pedido si falta stock', async () => {
    vi.mocked(registrarVenta).mockResolvedValue({ ok: false, codigo: 'STOCK_INSUFICIENTE', error: MENSAJES_ERROR.STOCK_INSUFICIENTE })
    const props = abrir(); transferencia(); fireEvent.click(screen.getByRole('button', { name: 'Sí, confirmar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(MENSAJES_ERROR.STOCK_INSUFICIENTE)
    expect(props.onVendido).not.toHaveBeenCalled()
  })
  it('avisa si no hay turno', async () => {
    vi.mocked(registrarVenta).mockResolvedValue({ ok: false, codigo: 'SIN_TURNO_ABIERTO', error: MENSAJES_ERROR.SIN_TURNO_ABIERTO })
    const props = abrir(); transferencia(); fireEvent.click(screen.getByRole('button', { name: 'Sí, confirmar' }))
    await waitFor(() => expect(props.onSinTurno).toHaveBeenCalled())
  })
  it('muestra el éxito y cierra después de dos segundos', async () => {
    vi.useFakeTimers()
    vi.mocked(registrarVenta).mockResolvedValue({ ok: true, data: { ventaId: 'v', totalGs: 31000, vueltoGs: 41500 } })
    const props = abrir(); transferencia()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Sí, confirmar' })) })
    expect(screen.getByText('Venta registrada')).toBeInTheDocument()
    expect(screen.getByText('Vuelto ₲ 41.500')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(2000))
    expect(props.onVendido).toHaveBeenCalledWith({ ventaId: 'v', totalGs: 31000, vueltoGs: 41500 })
    expect(props.onCerrar).toHaveBeenCalled()
    vi.useRealTimers()
  })
  it('Escape cierra sin registrar', () => {
    const props = abrir(); fireEvent.keyDown(document, { key: 'Escape' })
    expect(props.onCerrar).toHaveBeenCalled(); expect(registrarVenta).not.toHaveBeenCalled()
  })
})

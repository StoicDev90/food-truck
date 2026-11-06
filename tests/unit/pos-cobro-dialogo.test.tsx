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
      else { boton.focus(); fireEvent.keyDown(boton, { key: 'Enter' }); fireEvent.keyDown(boton, { key: 'Enter' }) }
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
  it('Enter en Cancelar cierra sin registrar', () => {
    const props = abrir(); transferencia()
    const boton = screen.getByRole('button', { name: 'Cancelar' }); boton.focus()
    if (fireEvent.keyDown(boton, { key: 'Enter' })) fireEvent.click(boton)
    expect(props.onCerrar).toHaveBeenCalledOnce()
    expect(registrarVenta).not.toHaveBeenCalled()
  })
  it('Enter en un medio y un importe rápido activa ese control sin registrar', () => {
    abrir()
    const medio = screen.getByRole('button', { name: 'Efectivo R$' }); medio.focus()
    if (fireEvent.keyDown(medio, { key: 'Enter' })) fireEvent.click(medio)
    expect(medio).toHaveAttribute('aria-pressed', 'true')
    const importe = screen.getByRole('button', { name: 'R$ 50' }); importe.focus()
    if (fireEvent.keyDown(importe, { key: 'Enter' })) fireEvent.click(importe)
    expect(screen.getByLabelText('Recibido')).toHaveValue('50')
    expect(registrarVenta).not.toHaveBeenCalled()
  })
  it('permite escribir 100 sin cambiar el medio', () => {
    abrir(); fireEvent.click(screen.getByRole('button', { name: 'Efectivo R$' }))
    const input = screen.getByLabelText('Recibido'); input.focus()
    for (const digit of '100') {
      if (fireEvent.keyDown(input, { key: digit })) fireEvent.change(input, { target: { value: (input as HTMLInputElement).value + digit } })
    }
    expect(input).toHaveValue('100')
    expect(screen.getByRole('button', { name: 'Efectivo R$' })).toHaveAttribute('aria-pressed', 'true')
  })
  it('no confirma un importe insuficiente con Enter', () => {
    abrir(); const input = screen.getByLabelText('Recibido')
    fireEvent.change(input, { target: { value: '20000' } }); input.focus()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(registrarVenta).not.toHaveBeenCalled()
  })
  it('confirma con Enter desde el importe suficiente', () => {
    vi.mocked(registrarVenta).mockReturnValue(new Promise(() => {}))
    abrir(); const input = screen.getByLabelText('Recibido')
    fireEvent.change(input, { target: { value: '31000' } }); input.focus()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(registrarVenta).toHaveBeenCalledOnce()
  })
  it('genera otra clave al abrir después de una venta', async () => {
    vi.useFakeTimers()
    vi.mocked(registrarVenta).mockResolvedValue({ ok: true, data: { ventaId: 'v', totalGs: 31000, vueltoGs: 0 } })
    const props = callbacks()
    const vista = render(<DialogoCobro abierto pedido={pedido} cotizacion={1450} {...props} />)
    transferencia(); await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Sí, confirmar' })) })
    act(() => vi.advanceTimersByTime(2000))
    vista.rerender(<DialogoCobro abierto={false} pedido={pedido} cotizacion={1450} {...props} />)
    vista.rerender(<DialogoCobro abierto pedido={pedido} cotizacion={1450} {...props} />)
    transferencia(); await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Sí, confirmar' })) })
    expect(vi.mocked(registrarVenta).mock.calls[0][0].clave).not.toBe(vi.mocked(registrarVenta).mock.calls[1][0].clave)
  })
  it.each(['cerrar', 'desmontar'])('cancela el timer de éxito al %s', async modo => {
    vi.useFakeTimers()
    vi.mocked(registrarVenta).mockResolvedValue({ ok: true, data: { ventaId: 'v', totalGs: 31000, vueltoGs: 0 } })
    const props = callbacks()
    const vista = render(<DialogoCobro abierto pedido={pedido} cotizacion={1450} {...props} />)
    transferencia(); await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Sí, confirmar' })) })
    if (modo === 'cerrar') vista.rerender(<DialogoCobro abierto={false} pedido={pedido} cotizacion={1450} {...props} />)
    else vista.unmount()
    act(() => vi.advanceTimersByTime(3000))
    expect(props.onVendido).not.toHaveBeenCalled()
  })
  it('permite reintentar un rechazo de red con la misma clave', async () => {
    vi.mocked(registrarVenta).mockRejectedValue(new Error('network'))
    abrir(); transferencia(); fireEvent.click(screen.getByRole('button', { name: 'Sí, confirmar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo completar. Probá de nuevo.')
    const boton = screen.getByRole('button', { name: 'Sí, confirmar' }); expect(boton).toBeEnabled()
    fireEvent.click(boton)
    await waitFor(() => expect(registrarVenta).toHaveBeenCalledTimes(2))
    expect(vi.mocked(registrarVenta).mock.calls[0][0].clave).toBe(vi.mocked(registrarVenta).mock.calls[1][0].clave)
  })
  it.each(['MONTO_INSUFICIENTE', 'SIN_COTIZACION'] as const)('muestra el error %s', async codigo => {
    vi.mocked(registrarVenta).mockResolvedValue({ ok: false, codigo, error: MENSAJES_ERROR[codigo] })
    abrir(); transferencia(); fireEvent.click(screen.getByRole('button', { name: 'Sí, confirmar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(MENSAJES_ERROR[codigo])
  })

})

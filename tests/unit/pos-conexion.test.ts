import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useConexion } from '@/lib/pos/useConexion'

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
it.each([
  ['sin red', false, true, false],
  ['fetch falla', true, false, false],
  ['servidor disponible', true, true, true],
])('%s', async (_, online, responde, esperado) => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online)
  vi.stubGlobal('fetch', responde ? vi.fn().mockResolvedValue({ ok: true, status: 204 }) : vi.fn().mockRejectedValue(new Error('red')))
  const { result } = renderHook(() => useConexion())
  await waitFor(() => expect(result.current).toBe(esperado))
})

it('pasa de conectado a desconectado al perder la red', async () => {
  const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
  const { result } = renderHook(() => useConexion())
  await waitFor(() => expect(result.current).toBe(true))
  online.mockReturnValue(false)
  act(() => window.dispatchEvent(new Event('offline')))
  expect(result.current).toBe(false)
})

it('pasa de conectado a desconectado si falla el siguiente ping', async () => {
  vi.useFakeTimers()
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true }).mockRejectedValueOnce(new Error('red'))
  vi.stubGlobal('fetch', fetchMock)
  const { result } = renderHook(() => useConexion())
  await act(async () => { await Promise.resolve() })
  expect(result.current).toBe(true)
  await act(async () => { await vi.advanceTimersByTimeAsync(15000) })
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(result.current).toBe(false)
})

import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useConexion } from '@/lib/pos/useConexion'

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
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

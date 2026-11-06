import { expect, test, vi } from 'vitest'
import { nombreNegocio } from '@/lib/admin/configuracion'

function cliente(data: { nombre: string } | null, error: Error | null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error })
  const eq = vi.fn().mockReturnValue({ maybeSingle })
  const select = vi.fn().mockReturnValue({ eq })
  return { from: vi.fn().mockReturnValue({ select }) }
}

test('lee el nombre configurado y usa el valor predeterminado solo si falta la fila', async () => {
  await expect(nombreNegocio(cliente({ nombre: 'Mi negocio' }, null) as never)).resolves.toBe('Mi negocio')
  await expect(nombreNegocio(cliente(null, null) as never)).resolves.toBe('Oasis Itaipu')
})

test('propaga errores de consulta', async () => {
  const error = new Error('falló la consulta')
  await expect(nombreNegocio(cliente(null, error) as never)).rejects.toBe(error)
})

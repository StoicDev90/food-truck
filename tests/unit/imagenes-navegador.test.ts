import { afterEach, expect, it, vi } from 'vitest'
import { achicarImagen, medidasAchicadas } from '@/lib/imagenes-navegador'

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

it.each([
  [4000, 3000, { ancho: 600, alto: 450 }],
  [300, 200, { ancho: 300, alto: 200 }],
  [1000, 2000, { ancho: 300, alto: 600 }],
])('ajusta %i × %i sin agrandar', (ancho, alto, esperado) => {
  expect(medidasAchicadas(ancho, alto, 600)).toEqual(esperado)
})

it('devuelve el archivo original si falla la exportación del canvas', async () => {
  const archivo = new File(['foto'], 'foto.png', { type: 'image/png' })
  const close = vi.fn()
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 1000, height: 500, close }))
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(null))
  expect(await achicarImagen(archivo)).toBe(archivo)
  expect(close).toHaveBeenCalledOnce()
})

it('devuelve el archivo original si falla la decodificación', async () => {
  const archivo = new File(['foto'], 'foto.png', { type: 'image/png' })
  vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('decode')))
  expect(await achicarImagen(archivo)).toBe(archivo)
})

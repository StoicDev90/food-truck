import { act, renderHook } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { SECCIONES_ADMIN } from '@/lib/admin/navegacion'
import { formatoFechaHora, hoyPy, rangoDeParams } from '@/lib/admin/fechas'
import { useEnvio } from '@/lib/admin/useEnvio'
import { textoValido } from '@/lib/acciones/resultado'

test('menú: grupos y rutas de la identidad §12', () => {
  expect(SECCIONES_ADMIN.map(g => g.titulo)).toEqual([null, 'Operación', 'Catálogo', 'Reportes', 'Ajustes'])
  expect(SECCIONES_ADMIN.flatMap(g => g.items.map(i => i.href))).toEqual(['/admin', '/admin/turnos', '/admin/caja', '/pos', '/admin/productos', '/admin/stock', '/admin/categorias', '/admin/reportes/ventas', '/admin/reportes/mas-vendidos', '/admin/reportes/anulaciones', '/admin/empleados', '/admin/cotizacion', '/admin/negocio'])
})
test('hoyPy usa Asunción', () => expect(hoyPy(new Date('2026-11-07T02:30:00Z'))).toBe('2026-11-06'))
test('rango por defecto: 7 días terminando hoy', () => expect(rangoDeParams({}, 7, new Date('2026-11-06T15:00:00Z'))).toEqual({ desde: '2026-10-31', hasta: '2026-11-06' }))
test('rango inválido vuelve al defecto', () => {
  const ahora = new Date('2026-11-06T15:00:00Z')
  for (const p of [{ desde: 'x' }, { desde: '2026-11-06', hasta: '2026-11-01' }, { desde: '2024-01-01', hasta: '2026-11-06' }, { desde: '2026-02-30', hasta: '2026-03-01' }])
    expect(rangoDeParams(p, 7, ahora)).toEqual({ desde: '2026-10-31', hasta: '2026-11-06' })
})
test('formatea fecha y hora en Asunción', () => expect(formatoFechaHora('2026-11-06T17:05:00Z')).toBe('06/11 14:05'))
test('texto válido mide el texto sin espacios exteriores', () => {
  expect(textoValido('  hola  ', 4)).toBe(true)
  expect(textoValido('  ', 4)).toBe(false)
  expect(textoValido('hola!', 4)).toBe(false)
})
test('useEnvio: segundo envío simultáneo no llama y libera el bloqueo', async () => {
  const { result } = renderHook(() => useEnvio())
  let resolver!: (value: string) => void
  const fn = vi.fn(() => new Promise<string>(resolve => { resolver = resolve }))
  let primero!: Promise<string | undefined>
  let segundo!: Promise<string | undefined>
  act(() => { primero = result.current.enviar(fn); segundo = result.current.enviar(fn) })
  expect(result.current.enviando).toBe(true)
  expect(await segundo).toBeUndefined()
  expect(fn).toHaveBeenCalledTimes(1)
  await act(async () => { resolver('ok'); expect(await primero).toBe('ok') })
  expect(result.current.enviando).toBe(false)
  await act(async () => { await expect(result.current.enviar(async () => 'otra')).resolves.toBe('otra') })
})

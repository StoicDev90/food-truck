import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({ acceso: vi.fn(), from: vi.fn(), tag: vi.fn(), refresh: vi.fn(), upload: vi.fn() }))
vi.mock('@/lib/auth/sesion', () => ({ requerirAcceso: m.acceso }))
vi.mock('@/lib/supabase/server', () => ({ crearClienteServidor: async () => ({ from: m.from }) }))
vi.mock('@/lib/supabase/client', () => ({ crearClienteNavegador: () => ({ storage: { from: () => ({ upload: m.upload }) } }) }))
vi.mock('next/cache', () => ({ updateTag: m.tag }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: m.refresh }), unstable_rethrow: () => {} }))
import { DIAS, validarHorarios } from '@/lib/admin/horarios'
import * as negocio from '@/lib/admin/negocio'
const { guardarNegocio } = negocio
import { FormNegocio } from '@/components/admin/FormNegocio'
const horarios = { lun: { abre: '18:00', cierra: '02:00' }, mar: null, mie: null, jue: null, vie: null, sab: null, dom: null }
const entrada = { nombre: 'Oasis', whatsapp: '', instagram: '', ubicacion: '', horarios, logoPath: null }
beforeEach(() => { vi.resetAllMocks(); m.acceso.mockResolvedValue({}) })
afterEach(cleanup)
it('valida los siete días y horas, incluso cierre después de medianoche', () => {
  expect(DIAS).toEqual(['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'])
  expect(validarHorarios(horarios)).toEqual(horarios)
  expect(validarHorarios({ ...horarios, lun: { abre: '25:00', cierra: '02:00' } })).toBeNull()
  const { dom: _dom, ...incompleto } = horarios; void _dom
  expect(validarHorarios(incompleto)).toBeNull()
})
it.each([{ instagram: '@oasis' }, { ubicacion: 'http://ejemplo.com' }, { ubicacion: 'https:ejemplo.com' }, { whatsapp: '0981 123 456' }, { logoPath: '../logo.png' }, { nombre: ' ' }])('rechaza valores inválidos %o', async cambio => {
  expect(await guardarNegocio({ ...entrada, ...cambio })).toMatchObject({ ok: false, codigo: 'VALOR_INVALIDO' })
  expect(m.from).not.toHaveBeenCalled()
})
it('guarda con sesión, convierte vacíos a null e invalida menú', async () => {
  const eq = vi.fn().mockResolvedValue({ error: null }); const update = vi.fn(() => ({ eq })); m.from.mockReturnValue({ update })
  expect(await guardarNegocio(entrada)).toEqual({ ok: true, data: null })
  expect(m.acceso).toHaveBeenCalledWith('admin'); expect(m.from).toHaveBeenCalledWith('configuracion')
  expect(update).toHaveBeenCalledWith({ nombre: 'Oasis', whatsapp: null, instagram: null, ubicacion: null, horarios, logo_path: null })
  expect(eq).toHaveBeenCalledWith('id', 1); expect(m.tag).toHaveBeenCalledWith('menu')
})
it('el formulario abre horarios vacíos, envía una vez y refresca', async () => {
  let resolver!: (v: { error: null }) => void
  const eq = vi.fn(() => new Promise<{ error: null }>(resolve => { resolver = resolve })); m.from.mockReturnValue({ update: () => ({ eq }) })
  const accion = vi.spyOn(negocio, 'guardarNegocio')
  render(<FormNegocio configuracion={{ nombre: 'Oasis', whatsapp: null, instagram: null, ubicacion: null, horarios: {}, logo_path: null }} />)
  expect(screen.getAllByRole('checkbox', { name: /Cerrado/ })).toHaveLength(7)
  expect(screen.getAllByRole('checkbox', { name: /Cerrado/ }).every(c => (c as HTMLInputElement).checked)).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  await act(async () => { await Promise.resolve() })
  fireEvent.submit(screen.getByRole('button', { name: 'Guardando…' }).closest('form')!)
  expect(accion).toHaveBeenCalledOnce(); expect(eq).toHaveBeenCalledOnce()
  await act(async () => resolver({ error: null })); expect(m.refresh).toHaveBeenCalledOnce()
})
it('bloquea Guardar mientras se sube el logo', async () => {
  let resolver!: (v: { error: null }) => void
  m.upload.mockReturnValue(new Promise(resolve => { resolver = resolve }))
  render(<FormNegocio configuracion={{ nombre: 'Oasis', whatsapp: null, instagram: null, ubicacion: null, horarios: {}, logo_path: null }} />)
  fireEvent.change(screen.getByLabelText('Foto'), { target: { files: [new File(['logo'], 'logo.png', { type: 'image/png' })] } })
  expect(screen.getByRole('button', { name: /Subiendo/ })).toBeDisabled()
  await act(async () => resolver({ error: null }))
  expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled()
  expect(screen.getByRole('img', { name: /logo/i })).toBeInTheDocument()
})

import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
const m = vi.hoisted(() => ({ crear: vi.fn(), reset: vi.fn(), activo: vi.fn(), desbloquear: vi.fn(), refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: m.refresh }) }))
vi.mock('@/lib/admin/empleados', () => ({ crearEmpleado: m.crear, resetearPin: m.reset, cambiarActivoEmpleado: m.activo, desbloquearEmpleado: m.desbloquear }))
import { FormEmpleado } from '@/components/admin/FormEmpleado'
import { TablaEmpleados } from '@/components/admin/TablaEmpleados'
const empleado = { id: '123e4567-e89b-42d3-a456-426614174000', nombre: 'Juan', usuario: 'juan', activo: true, bloqueadoHasta: null }
beforeEach(() => { vi.resetAllMocks(); for (const f of [m.crear, m.reset, m.activo, m.desbloquear]) f.mockImplementation(() => new Promise(() => {})) })
it('crear envía una sola vez ante doble clic', () => {
  render(<FormEmpleado />)
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Juan' } })
  fireEvent.change(screen.getByLabelText(/Usuario/), { target: { value: 'juan' } })
  fireEvent.change(screen.getByLabelText(/PIN/), { target: { value: '123456' } })
  const boton = screen.getByRole('button', { name: 'Crear' }); fireEvent.click(boton); fireEvent.click(boton)
  expect(m.crear).toHaveBeenCalledTimes(1)
  expect(m.crear).toHaveBeenCalledWith({ nombre: 'Juan', usuario: 'juan', pin: '123456' })
})
it('resetear PIN envía una vez', () => {
  render(<TablaEmpleados empleados={[empleado]} />)
  fireEvent.change(screen.getByLabelText('Nuevo PIN'), { target: { value: '654321' } })
  const boton = screen.getByRole('button', { name: 'Resetear PIN' }); fireEvent.click(boton); fireEvent.click(boton)
  expect(m.reset).toHaveBeenCalledOnce(); expect(m.reset).toHaveBeenCalledWith(empleado.id, '654321')
})
it.each([[true, 'Desactivar', false], [false, 'Activar', true]] as const)('%s cambia estado una vez', (activo, texto, valor) => {
  render(<TablaEmpleados empleados={[{ ...empleado, activo }]} />)
  const boton = screen.getByRole('button', { name: texto }); fireEvent.click(boton); fireEvent.click(boton)
  expect(m.activo).toHaveBeenCalledOnce(); expect(m.activo).toHaveBeenCalledWith(empleado.id, valor)
})
it('desbloquear envía una vez', () => {
  render(<TablaEmpleados empleados={[empleado]} />)
  const boton = screen.getByRole('button', { name: 'Desbloquear' }); fireEvent.click(boton); fireEvent.click(boton)
  expect(m.desbloquear).toHaveBeenCalledOnce(); expect(m.desbloquear).toHaveBeenCalledWith(empleado.id)
})

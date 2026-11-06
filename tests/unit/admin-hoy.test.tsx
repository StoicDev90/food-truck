import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { alertasHoy } from '@/lib/admin/hoy'

const m = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), acceso: vi.fn() }))
vi.mock('@/lib/auth/sesion', () => ({ requerirAcceso: m.acceso }))
vi.mock('@/lib/supabase/server', () => ({ crearClienteServidor: async () => ({ rpc: m.rpc, from: m.from }) }))
import Page from '@/app/admin/(protegido)/page'

afterEach(() => { cleanup(); vi.resetAllMocks() })
const producto = (id: string, nombre: string, stock: number, controlaStock = true, activo = true) => ({ id, nombre, stock, controlaStock, activo })

it('ordena alertas y omite productos sin control o inactivos', () => {
  const alertas = alertasHoy({ productos: [producto('2', 'Empanada choclo', 3), producto('1', 'Coxinha', 0), producto('3', 'Libre', 0, false), producto('4', 'Inactivo', 0, true, false)], ultimoCierre: { empleadoNombre: 'Ana', fecha: '06/11', diferenciaGs: -5000, diferenciaBrl: 0 }, anuladasHoy: 2 })
  expect(alertas).toEqual([
    { tipo: 'sin_stock', texto: 'Coxinha sin stock', href: '/admin/stock?producto=1' },
    { tipo: 'stock_bajo', texto: 'Empanada choclo · quedan 3', href: '/admin/stock?producto=2' },
    { tipo: 'diferencia', texto: 'Cierre de 06/11 (Ana): faltan ₲ 5.000', href: '/admin/turnos' },
    { tipo: 'anuladas', texto: '2 ventas anuladas hoy', href: '/admin/reportes/anulaciones' },
  ])
})
it('muestra sobrantes y omite diferencias en cero', () => {
  const base = { productos: [], anuladasHoy: 0 }
  expect(alertasHoy({ ...base, ultimoCierre: { empleadoNombre: 'Ana', fecha: '06/11', diferenciaGs: 2000, diferenciaBrl: 0 } })[0].texto).toContain('sobran ₲ 2.000')
  expect(alertasHoy({ ...base, ultimoCierre: { empleadoNombre: 'Ana', fecha: '06/11', diferenciaGs: 0, diferenciaBrl: 0 } })).toEqual([])
})
it('muestra estados vacíos sin turno ni cotización', async () => {
  m.rpc.mockResolvedValue({ data: [], error: null })
  m.from.mockImplementation(() => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }), then: (resolve: (x: unknown) => void) => resolve({ data: [], error: null }) }) }))
  render(await Page())
  expect(m.acceso).toHaveBeenCalledWith('admin')
  expect(screen.getByText('Sin turno abierto')).toBeInTheDocument()
  expect(screen.getByText('Sin cotización')).toBeInTheDocument()
  expect(screen.getByText('Todo en orden')).toBeInTheDocument()
})
it('usa los datos de hoy, el primer cierre cerrado y la cotización manual', async () => {
  vi.useFakeTimers().setSystemTime(new Date('2026-11-06T15:00:00Z'))
  m.rpc.mockImplementation(async (name: string) => ({ error: null, data: ({
    reporte_ventas: [{ fecha: '2026-11-06', empleado_id: 'e', empleado_nombre: 'Ana', medio: 'efectivo_brl', ventas: '2', anuladas: '1', total_gs: '31000', recibido_brl: '20', equivalente_gs: '31000', anuladas_gs: '5000' }],
    reporte_mas_vendidos: [{ producto_id: 'p', nombre: 'Coxinha', cantidad: '2', ganancia_gs: null }],
    reporte_cierres: [{ cerrado_at: null }, { cerrado_at: '2026-11-06T12:00:00Z', fecha: '2026-11-06', empleado_nombre: 'Ana', diferencia_gs: '-5000', diferencia_brl: null }],
    turno_actual: [{ empleado_nombre: 'Juan', abierto_at: '2026-11-06T10:00:00Z' }],
  } as Record<string, unknown>)[name] }))
  m.from.mockImplementation((tabla: string) => ({ select: () => tabla === 'cotizaciones' ? { eq: () => ({ maybeSingle: async () => ({ data: { valor_manual: 1450.5, valor_api: 1400 }, error: null }) }) } : Promise.resolve({ data: [{ id: 'p', nombre: 'Coxinha', stock: 0, controla_stock: true, activo: true }], error: null }) }))
  render(await Page())
  expect(m.rpc).toHaveBeenCalledWith('reporte_ventas', { p_desde: '2026-11-06', p_hasta: '2026-11-06' })
  expect(m.rpc).toHaveBeenCalledWith('reporte_cierres', { p_desde: '2026-10-31', p_hasta: '2026-11-06' })
  expect(screen.getByText(/Turno abierto: Juan desde/)).toBeInTheDocument()
  expect(screen.getByText('Cotización: ₲ 1.450,50 (manual)')).toBeInTheDocument()
  expect(screen.getByText('+ R$ 20,00 (≈ ₲ 31.000)')).toBeInTheDocument()
  expect(screen.getByText('sin costo')).toBeInTheDocument()
  expect(screen.getByText('Cierre de 2026-11-06 (Ana): faltan ₲ 5.000')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/admin/stock?producto=p')
  vi.useRealTimers()
})
it('muestra errores de RPC', async () => {
  m.rpc.mockResolvedValue({ data: null, error: { message: 'NO_AUTORIZADO' } })
  m.from.mockImplementation(() => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }), then: (resolve: (x: unknown) => void) => resolve({ data: [], error: null }) }) }))
  render(await Page())
  expect(screen.getByRole('alert')).toHaveTextContent('No tenés permiso para realizar esta acción.')
})

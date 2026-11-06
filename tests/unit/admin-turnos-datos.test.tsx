import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { mapCierre } from '@/lib/caja/resumen'
import type { Database } from '@/types/supabase'
const m = vi.hoisted(() => ({ rpc: vi.fn(), acceso: vi.fn(), from: vi.fn() }))
vi.mock('@/lib/auth/sesion', () => ({ requerirAcceso: m.acceso }))
vi.mock('@/lib/supabase/server', () => ({ crearClienteServidor: async () => ({ rpc: m.rpc, from: m.from }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }), unstable_rethrow: () => {} }))
import Page from '@/app/admin/(protegido)/turnos/page'
import { corregirConteo } from '@/lib/admin/turnos'
afterEach(() => { cleanup(); vi.resetAllMocks() })
const fila = { turno_id: 'id', fecha: '2026-11-06', empleado_nombre: 'Juan', abierto_at: '2026-11-06T12:00:00Z', cerrado_at: '2026-11-06T18:00:00Z', cerrado_por_nombre: 'Ana', corregido: false, contado_anterior_gs: null, contado_anterior_brl: null, fondo_gs: 100000, fondo_brl: 0, ventas_efectivo_gs: 1250000, ventas_efectivo_brl: 120, entradas_gs: 0, entradas_brl: 0, salidas_gs: 530000, salidas_brl: 0, esperado_gs: 820000, esperado_brl: 120, contado_gs: 815000, contado_brl: 120, diferencia_gs: -5000, diferencia_brl: 0, transferencias_gs: 480000, tarjetas_gs: 910000 }
it('muestra diferencias y conserva nulos en el reporte', async () => { m.rpc.mockImplementation((nombre: string) => Promise.resolve({ data: nombre === 'turno_actual' ? [] : [fila], error: null })); m.from.mockReturnValue({ select: () => ({ in: () => ({ order: async () => ({ data: [], error: null }) }) }) }); render(await Page({ searchParams: Promise.resolve({ desde: '2026-11-01', hasta: '2026-11-06' }) })); expect(screen.getAllByText(/Falta ₲ 5.000/).length).toBeGreaterThan(0); expect(screen.getByText('Cerrado por Ana')).toBeInTheDocument(); const abierto = mapCierre({ ...fila, contado_gs: null, contado_brl: null, diferencia_gs: null, diferencia_brl: null, cerrado_at: null, cerrado_por_nombre: null } as unknown as Database['public']['Functions']['reporte_cierres']['Returns'][number]); expect(abierto.contadoGs).toBeNull(); expect(abierto.diferenciaBrl).toBeNull(); expect(abierto.cerradoAt).toBeNull() })
it('rechaza una corrección sin motivo antes del RPC', async () => { const result = await corregirConteo('00000000-0000-0000-0000-000000000001', 0, 0, ' '); expect(result).toMatchObject({ ok: false, codigo: 'MOTIVO_REQUERIDO' }); expect(m.rpc).not.toHaveBeenCalled() })

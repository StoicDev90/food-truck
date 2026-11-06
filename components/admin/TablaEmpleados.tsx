'use client'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { resetearPin, cambiarActivoEmpleado, desbloquearEmpleado } from '@/lib/admin/empleados'
import { useEnvio } from '@/lib/admin/useEnvio'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export type Empleado = { id: string; nombre: string; usuario: string; activo: boolean; bloqueadoHasta: string | null }
function Fila({ empleado: e }: { empleado: Empleado }) {
  const router = useRouter(); const { enviar, enviando } = useEnvio(); const [pin, setPin] = useState(''); const [error, setError] = useState(''); const [mensaje, setMensaje] = useState('')
  function ejecutar(fn: () => ReturnType<typeof resetearPin>, exito: string) {
    setError(''); setMensaje('')
    void enviar(async () => { const r = await fn(); if (!r.ok) { setError(r.error); return }; setPin(''); setMensaje(exito); router.refresh() })
  }
  function reset(evn: FormEvent) { evn.preventDefault(); ejecutar(() => resetearPin(e.id, pin), 'PIN actualizado.') }
  return <tr className="border-t"><td className="py-3 pr-4">{e.nombre}</td><td className="pr-4">{e.usuario}</td><td className="pr-4">{e.activo ? 'Activo' : 'Inactivo'}{e.bloqueadoHasta && <div>Bloqueado hasta {new Intl.DateTimeFormat('es-PY', { timeZone: 'America/Asuncion', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(e.bloqueadoHasta))}</div>}</td><td className="space-y-2 py-3">
    <form onSubmit={reset} className="flex flex-wrap items-end gap-2"><label>Nuevo PIN<Input className="min-h-11" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{6}" required value={pin} onChange={ev => setPin(ev.target.value)} /></label><Button type="submit" className="min-h-11" disabled={enviando}>{enviando ? 'Guardando…' : 'Resetear PIN'}</Button></form>
    <div className="flex flex-wrap gap-2"><Button type="button" className="min-h-11" disabled={enviando} onClick={() => ejecutar(() => cambiarActivoEmpleado(e.id, !e.activo), 'Estado actualizado.')}>{enviando ? 'Guardando…' : e.activo ? 'Desactivar' : 'Activar'}</Button><Button type="button" className="min-h-11" disabled={enviando} onClick={() => ejecutar(() => desbloquearEmpleado(e.id), 'Cuenta desbloqueada.')}>{enviando ? 'Guardando…' : 'Desbloquear'}</Button></div>
    {error && <p role="alert" className="text-destructive-texto">{error}</p>}{mensaje && <p role="status">{mensaje}</p>}
  </td></tr>
}
export function TablaEmpleados({ empleados }: { empleados: Empleado[] }) {
  if (!empleados.length) return <p>No hay empleados.</p>
  return <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr><th>Nombre</th><th>Usuario</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{empleados.map(e => <Fila key={e.id} empleado={e} />)}</tbody></table></div>
}

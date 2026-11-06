'use client'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { crearEmpleado } from '@/lib/admin/empleados'
import { useEnvio } from '@/lib/admin/useEnvio'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function FormEmpleado() {
  const router = useRouter(); const { enviar, enviando } = useEnvio()
  const [nombre, setNombre] = useState(''); const [usuario, setUsuario] = useState(''); const [pin, setPin] = useState(''); const [mensaje, setMensaje] = useState(''); const [error, setError] = useState('')
  function guardar(e: FormEvent) {
    e.preventDefault(); setError(''); setMensaje('')
    void enviar(async () => {
      const r = await crearEmpleado({ nombre, usuario, pin })
      if (!r.ok) { setError(r.error); return }
      setNombre(''); setUsuario(''); setPin(''); setMensaje('Empleado creado.'); router.refresh()
    })
  }
  return <form onSubmit={guardar} className="space-y-4 rounded-lg border p-4">
    <h2 className="font-heading text-xl">Crear empleado</h2>
    <label className="block">Nombre<Input className="min-h-11" value={nombre} onChange={e => setNombre(e.target.value)} maxLength={80} required /></label>
    <label className="block">Usuario (3–20 caracteres: a-z, 0-9, _)<Input className="min-h-11" value={usuario} onChange={e => setUsuario(e.target.value)} minLength={3} maxLength={20} required /></label>
    <label className="block">PIN (6 dígitos)<Input className="min-h-11" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{6}" value={pin} onChange={e => setPin(e.target.value)} required /></label>
    <Button type="submit" className="min-h-11" disabled={enviando}>{enviando ? 'Guardando…' : 'Crear'}</Button>
    {error && <p role="alert" className="text-destructive-texto">{error}</p>}{mensaje && <p role="status">{mensaje}</p>}
  </form>
}

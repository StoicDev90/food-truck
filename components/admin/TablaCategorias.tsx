'use client'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { borrarCategoria, crearCategoria, editarCategoria } from '@/lib/admin/catalogo'
import { useEnvio } from '@/lib/admin/useEnvio'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Categoria = { id: string; nombre: string; orden: number }
function Fila({ categoria }: { categoria?: Categoria }) {
  const router = useRouter(); const { enviar, enviando } = useEnvio()
  const [nombre, setNombre] = useState(categoria?.nombre ?? '')
  const [orden, setOrden] = useState(String(categoria?.orden ?? 0))
  const [error, setError] = useState('')
  function guardar(e: FormEvent) {
    e.preventDefault(); setError('')
    const n = Number(orden)
    if (!/^\d+$/.test(orden) || !Number.isSafeInteger(n)) { setError('Orden inválido'); return }
    void enviar(async () => {
      const r = categoria ? await editarCategoria(categoria.id, nombre, n) : await crearCategoria(nombre, n)
      if (!r.ok) { setError(r.error); return }
      if (!categoria) { setNombre(''); setOrden('0') }
      router.refresh()
    })
  }
  function borrar() {
    if (!categoria || !window.confirm(`¿Borrar la categoría ${categoria.nombre}?`)) return
    void enviar(async () => { const r = await borrarCategoria(categoria.id); if (!r.ok) setError(r.error); else router.refresh() })
  }
  return <form onSubmit={guardar} className="flex flex-wrap items-end gap-3 border-b py-4"><label className="min-w-48 flex-1">Nombre<Input className="min-h-11" value={nombre} onChange={e => setNombre(e.target.value)} maxLength={80} required /></label><label>Orden<Input className="min-h-11 w-24" inputMode="numeric" value={orden} onChange={e => setOrden(e.target.value)} required /></label><Button className="min-h-11" disabled={enviando}>{enviando ? 'Guardando…' : categoria ? 'Guardar' : 'Agregar'}</Button>{categoria && <Button className="min-h-11" type="button" variant="outline" disabled={enviando} onClick={borrar}>Borrar</Button>}{error && <p className="w-full text-destructive-texto" role="alert">{error}</p>}</form>
}
export function TablaCategorias({ categorias }: { categorias: Categoria[] }) {
  return <div><Fila />{categorias.map(c => <Fila key={`${c.id}-${c.nombre}-${c.orden}`} categoria={c} />)}</div>
}

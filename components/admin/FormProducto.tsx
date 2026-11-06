'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { crearProducto, editarProducto, type EntradaProducto } from '@/lib/admin/catalogo'
import { useEnvio } from '@/lib/admin/useEnvio'
import { parseMontoGs } from '@/lib/pos/formato'
import { SubirImagen } from './SubirImagen'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Categoria = { id: string; nombre: string }
export function FormProducto({ categorias, producto, onGuardado }: { categorias: Categoria[]; producto?: EntradaProducto & { id: string }; onGuardado?: () => void }) {
  const router = useRouter()
  const [nombre, setNombre] = useState(producto?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(producto?.descripcion ?? '')
  const [categoriaId, setCategoria] = useState(producto?.categoriaId ?? categorias[0]?.id ?? '')
  const [precio, setPrecio] = useState(producto ? String(producto.precioGs) : '')
  const [costo, setCosto] = useState(producto?.costoGs != null ? String(producto.costoGs) : '')
  const [controlaStock, setControlaStock] = useState(producto?.controlaStock ?? false)
  const [visible, setVisible] = useState(producto?.visible ?? true)
  const [fotoPath, setFoto] = useState<string | null>(producto?.fotoPath ?? null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [error, setError] = useState('')
  const [errorPrecio, setErrorPrecio] = useState('')
  const { enviando, enviar } = useEnvio()
  function guardar(event: FormEvent) {
    event.preventDefault()
    if (subiendoFoto) return
    const precioGs = parseMontoGs(precio); const costoGs = costo.trim() ? parseMontoGs(costo) : null
    setErrorPrecio(precioGs === null ? 'Precio inválido' : '')
    if (precioGs === null) return
    if (costo.trim() && costoGs === null) { setError('Costo inválido'); return }
    setError('')
    void enviar(async () => {
      const entrada = { nombre, descripcion, categoriaId, precioGs, costoGs, controlaStock, visible, fotoPath }
      const resultado = producto ? await editarProducto(producto.id, entrada) : await crearProducto(entrada)
      if (!resultado.ok) { setError(resultado.error); return }
      onGuardado?.(); router.refresh()
    })
  }
  const input = 'min-h-11 w-full'
  return <form onSubmit={guardar} className="space-y-4 rounded-lg border p-4">
    <div><label htmlFor="nombre">Nombre</label><Input className={input} id="nombre" value={nombre} onChange={e => setNombre(e.target.value)} required maxLength={80} /></div>
    <div><label htmlFor="descripcion">Descripción</label><textarea className="min-h-11 w-full rounded-md border bg-background p-2" id="descripcion" value={descripcion} onChange={e => setDescripcion(e.target.value)} maxLength={200} /></div>
    <div><label htmlFor="categoria">Categoría</label><select className="min-h-11 w-full rounded-md border bg-background p-2" id="categoria" value={categoriaId} onChange={e => setCategoria(e.target.value)} required>{categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
    <div><label htmlFor="precio">Precio</label><Input className={input} id="precio" inputMode="numeric" value={precio} onChange={e => setPrecio(e.target.value)} aria-invalid={!!errorPrecio} aria-describedby={errorPrecio ? 'error-precio' : undefined} />{errorPrecio && <p id="error-precio" role="alert" className="text-destructive-texto">{errorPrecio}</p>}</div>
    <div><label htmlFor="costo">Costo</label><Input className={input} id="costo" inputMode="numeric" value={costo} onChange={e => setCosto(e.target.value)} /></div>
    <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={controlaStock} onChange={e => setControlaStock(e.target.checked)} />Controla stock</label>
    <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={visible} onChange={e => setVisible(e.target.checked)} />Visible en el menú</label>
    <SubirImagen carpeta="productos" valor={fotoPath} onChange={setFoto} onUploadingChange={setSubiendoFoto} />
    {error && <p role="alert" className="text-destructive-texto">{error}</p>}
    <Button className="min-h-11" type="submit" disabled={enviando || subiendoFoto || !categoriaId}>{enviando ? 'Guardando…' : subiendoFoto ? 'Subiendo foto…' : 'Guardar'}</Button>
  </form>
}

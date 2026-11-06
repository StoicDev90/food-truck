'use client'

import { useState } from 'react'
import { crearClienteNavegador } from '@/lib/supabase/client'
import { urlImagen } from '@/lib/imagenes'

export function SubirImagen({ carpeta, valor, onChange, onUploadingChange }: { carpeta: 'productos' | 'marca'; valor: string | null; onChange: (path: string | null) => void; onUploadingChange?: (subiendo: boolean) => void }) {
  const [error, setError] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  async function subir(file: File) {
    const extensiones: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
    const ext = extensiones[file.type]
    if (!ext || file.size > 2 * 1024 * 1024) { setError('Elegí una imagen JPEG, PNG o WebP de hasta 2 MB.'); return }
    setError(''); setSubiendo(true); onUploadingChange?.(true)
    try {
      const path = `${carpeta}/${crypto.randomUUID()}.${ext}`
      const { error } = await crearClienteNavegador().storage.from('imagenes').upload(path, file)
      if (error) { setError('No se pudo subir la imagen. Probá de nuevo.'); return }
      onChange(path)
    } catch { setError('No se pudo subir la imagen. Probá de nuevo.') } finally { setSubiendo(false); onUploadingChange?.(false) }
  }
  return <div className="space-y-2"><label className="block" htmlFor="foto">Foto</label>{valor && <a className="underline" href={urlImagen(valor) ?? undefined} target="_blank" rel="noreferrer">Ver imagen actual</a>}<input id="foto" className="block min-h-11 w-full" type="file" accept="image/jpeg,image/png,image/webp" disabled={subiendo} onChange={e => { const file = e.target.files?.[0]; if (file) void subir(file); e.target.value = '' }} />{subiendo && <p>Subiendo…</p>}{valor && <button type="button" className="min-h-11 underline" onClick={() => onChange(null)}>Quitar foto</button>}{error && <p role="alert" className="text-destructive-texto">{error}</p>}</div>
}

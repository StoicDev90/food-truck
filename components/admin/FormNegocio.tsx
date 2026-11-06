'use client'

import Image from 'next/image'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { DIAS, validarHorarios, type Horarios } from '@/lib/admin/horarios'
import { guardarNegocio } from '@/lib/admin/negocio'
import { useEnvio } from '@/lib/admin/useEnvio'
import { urlImagen } from '@/lib/imagenes'
import { SubirImagen } from './SubirImagen'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const nombres = { lun: 'Lunes', mar: 'Martes', mie: 'Miércoles', jue: 'Jueves', vie: 'Viernes', sab: 'Sábado', dom: 'Domingo' }
type Configuracion = { nombre: string; whatsapp: string | null; instagram: string | null; ubicacion: string | null; horarios: unknown; logo_path: string | null }
export function FormNegocio({ configuracion }: { configuracion: Configuracion }) {
  const router = useRouter()
  const [nombre, setNombre] = useState(configuracion.nombre)
  const [whatsapp, setWhatsapp] = useState(configuracion.whatsapp ?? '')
  const [instagram, setInstagram] = useState(configuracion.instagram ?? '')
  const [ubicacion, setUbicacion] = useState(configuracion.ubicacion ?? '')
  const [horarios, setHorarios] = useState<Horarios>(() => validarHorarios(configuracion.horarios) ?? Object.fromEntries(DIAS.map(d => [d, null])) as Horarios)
  const [logoPath, setLogo] = useState(configuracion.logo_path)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')
  const [guardado, setGuardado] = useState(false)
  const { enviando, enviar } = useEnvio()
  function guardar(event: FormEvent) {
    event.preventDefault()
    if (subiendo) return
    setError(''); setGuardado(false)
    void enviar(async () => {
      const resultado = await guardarNegocio({ nombre, whatsapp, instagram, ubicacion, horarios, logoPath })
      if (!resultado.ok) { setError(resultado.error); return }
      setGuardado(true); router.refresh()
    })
  }
  const imagen = urlImagen(logoPath)
  return <form onSubmit={guardar} className="space-y-5 rounded-lg border p-4">
    <div><label htmlFor="nombre">Nombre del negocio</label><Input id="nombre" className="min-h-11" value={nombre} onChange={e => setNombre(e.target.value)} maxLength={60} required /></div>
    <div><label htmlFor="whatsapp">WhatsApp (con código de país, solo dígitos)</label><Input id="whatsapp" className="min-h-11" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} inputMode="numeric" /></div>
    <div><label htmlFor="instagram">Instagram (sin @)</label><Input id="instagram" className="min-h-11" value={instagram} onChange={e => setInstagram(e.target.value)} /></div>
    <div><label htmlFor="ubicacion">Enlace del mapa (https://)</label><Input id="ubicacion" className="min-h-11" value={ubicacion} onChange={e => setUbicacion(e.target.value)} /></div>
    <fieldset className="space-y-3"><legend className="font-heading text-lg">Horarios</legend><p>Si el cierre es igual o anterior a la apertura, corresponde al día siguiente.</p>
      {DIAS.map(dia => <fieldset key={dia} className="rounded-md border p-3"><legend>{nombres[dia]}</legend>
        <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={horarios[dia] === null} onChange={e => setHorarios(h => ({ ...h, [dia]: e.target.checked ? null : { abre: '18:00', cierra: '23:00' } }))} />Cerrado {nombres[dia]}</label>
        <div className="flex flex-wrap gap-4"><div><label htmlFor={`${dia}-abre`}>Abre</label><Input id={`${dia}-abre`} type="time" className="min-h-11" disabled={horarios[dia] === null} required value={horarios[dia]?.abre ?? ''} onChange={e => setHorarios(h => ({ ...h, [dia]: { ...h[dia]!, abre: e.target.value } }))} /></div>
        <div><label htmlFor={`${dia}-cierra`}>Cierra</label><Input id={`${dia}-cierra`} type="time" className="min-h-11" disabled={horarios[dia] === null} required value={horarios[dia]?.cierra ?? ''} onChange={e => setHorarios(h => ({ ...h, [dia]: { ...h[dia]!, cierra: e.target.value } }))} /></div></div>
      </fieldset>)}
    </fieldset>
    <div><h2 className="font-heading text-lg">Logo</h2>{imagen && <Image src={imagen} alt="Vista previa del logo" width={160} height={160} unoptimized className="my-2 max-h-40 w-auto object-contain" />}<SubirImagen carpeta="marca" valor={logoPath} onChange={setLogo} onUploadingChange={setSubiendo} /></div>
    {error && <p role="alert" className="text-destructive-texto">{error}</p>}{guardado && <p role="status">Datos guardados.</p>}
    <Button type="submit" className="min-h-11" disabled={enviando || subiendo}>{enviando ? 'Guardando…' : subiendo ? 'Subiendo logo…' : 'Guardar'}</Button>
  </form>
}

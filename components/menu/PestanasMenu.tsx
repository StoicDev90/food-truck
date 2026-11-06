'use client'

import { useEffect, useRef, useState } from 'react'
import { seccionActiva } from '@/lib/menu/scroll-spy'
import type { SeccionMenu } from '@/lib/menu/armar'

export function PestanasMenu({ secciones }: { secciones: SeccionMenu[] }) {
  const [activa, setActiva] = useState<string | undefined>(secciones[0]?.id)
  const bloqueo = useRef(false)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nav = useRef<HTMLElement>(null)
  useEffect(() => {
    const actualizar = () => {
      if (bloqueo.current) return
      const posiciones = secciones.flatMap(s => {
        const el = document.getElementById(`cat-${s.id}`)
        return el ? [{ id: s.id, top: el.getBoundingClientRect().top }] : []
      })
      const offset = nav.current?.getBoundingClientRect().bottom ?? 0
      const maximo = document.documentElement.scrollHeight - window.innerHeight
      setActiva(seccionActiva(posiciones, offset, maximo > 0 && window.scrollY >= maximo - 2))
    }
    const desbloquear = () => {
      bloqueo.current = false
      if (temporizador.current) clearTimeout(temporizador.current)
      temporizador.current = null
    }
    actualizar()
    window.addEventListener('scrollend', desbloquear)
    window.addEventListener('wheel', desbloquear, { passive: true })
    window.addEventListener('touchstart', desbloquear, { passive: true })
    window.addEventListener('keydown', desbloquear)
    window.addEventListener('scroll', actualizar, { passive: true })
    window.addEventListener('resize', actualizar)
    return () => {
      desbloquear()
      window.removeEventListener('scrollend', desbloquear)
      window.removeEventListener('wheel', desbloquear)
      window.removeEventListener('touchstart', desbloquear)
      window.removeEventListener('keydown', desbloquear)
      window.removeEventListener('scroll', actualizar)
      window.removeEventListener('resize', actualizar)
    }
  }, [secciones])
  if (!secciones.length) return null
  return <nav ref={nav} aria-label="Categorías" className="flex gap-2 overflow-x-auto px-4 py-3">
    {secciones.map(s => <a key={s.id} href={`#cat-${s.id}`} aria-current={activa === s.id ? 'true' : undefined} onClick={() => { bloqueo.current = true; if (temporizador.current) clearTimeout(temporizador.current); temporizador.current = setTimeout(() => { bloqueo.current = false }, 1000); setActiva(s.id) }} className={`flex min-h-11 shrink-0 items-center rounded-full px-5 text-sm font-bold transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${activa === s.id ? 'bg-secondary text-secondary-foreground dark:bg-primary dark:text-primary-foreground' : 'bg-muted text-foreground hover:bg-accent'}`}>{s.nombre}</a>)}
  </nav>
}

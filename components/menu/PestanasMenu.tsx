'use client'

import { useEffect, useState } from 'react'
import type { SeccionMenu } from '@/lib/menu/armar'

export function PestanasMenu({ secciones }: { secciones: SeccionMenu[] }) {
  const [activa, setActiva] = useState(secciones[0]?.id)
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) setActiva(entry.target.id.slice(4))
    }, { rootMargin: '-140px 0px -60% 0px' })
    secciones.forEach(s => { const el = document.getElementById(`cat-${s.id}`); if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [secciones])
  if (!secciones.length) return null
  return <nav aria-label="Categorías" className="flex gap-2 overflow-x-auto px-4 py-3">
    {secciones.map(s => <a key={s.id} href={`#cat-${s.id}`} aria-current={activa === s.id ? 'true' : undefined} onClick={() => setActiva(s.id)} className={`flex min-h-11 shrink-0 items-center rounded-full px-5 text-sm font-bold transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${activa === s.id ? 'bg-secondary text-secondary-foreground dark:bg-primary dark:text-primary-foreground' : 'bg-muted text-foreground hover:bg-accent'}`}>{s.nombre}</a>)}
  </nav>
}

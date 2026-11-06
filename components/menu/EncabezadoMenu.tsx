'use client'

import { useEffect, useRef, useState } from 'react'
import { Sticker } from '@/components/marca/Sticker'
import { Palmera } from '@/components/marca/Palmera'
import { BotonTema } from '@/components/tema/BotonTema'
import type { DatosMenu } from '@/lib/menu/armar'
import { EstadoAbierto } from './EstadoAbierto'
import { PestanasMenu } from './PestanasMenu'

export function EncabezadoMenu({ menu }: { menu: DatosMenu }) {
  const sentinela = useRef<HTMLDivElement>(null)
  const [compacto, setCompacto] = useState(false)
  useEffect(() => {
    if (!sentinela.current || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setCompacto(!entry.isIntersecting && entry.boundingClientRect.top < 0))
    observer.observe(sentinela.current)
    return () => observer.disconnect()
  }, [])
  return <>
    <header className="relative mx-auto flex max-w-2xl flex-col items-center gap-3 bg-[radial-gradient(ellipse_at_center,var(--muted),var(--background)_70%)] px-4 pb-7 pt-8">
      <BotonTema className="absolute right-4 top-4" />
      <Sticker size={130} />
      <h1 className="sr-only">{menu.nombre} · Menú</h1>
      <EstadoAbierto horarios={menu.horarios} />
    </header>
    <div ref={sentinela} aria-hidden="true" className="h-px" />
    <div className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto max-w-2xl">
        {compacto && <div className="flex h-14 items-center gap-2 px-4 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150"><Palmera size={36} /><span className="flex-1 font-heading text-lg font-semibold text-marca">{menu.nombre}</span><BotonTema /></div>}
        <PestanasMenu secciones={menu.secciones} />
      </div>
    </div>
  </>
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Palmera } from '@/components/marca/Palmera'
import { BotonTema } from '@/components/tema/BotonTema'
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cerrarSesion } from '@/lib/auth/acciones'
import { SECCIONES_ADMIN } from '@/lib/admin/navegacion'

export function BarraLateral({ nombre, alNavegar }: { nombre: string; alNavegar?: () => void }) {
  const pathname = usePathname()
  return <aside className="dark flex h-full flex-col overflow-y-auto bg-sidebar p-4 text-sidebar-foreground">
    <div className="flex items-center gap-3 pb-5 pr-10">
      <Palmera size={48} variante="noche" />
      <div><p className="font-heading text-lg font-semibold">{nombre}</p><p className="text-sm">Panel de dueños</p></div>
    </div>
    <nav aria-label="Panel de dueños" className="flex-1 space-y-4">
      {SECCIONES_ADMIN.map((grupo, i) => <div key={grupo.titulo ?? i}>
        {grupo.titulo && <p className="px-3 pb-1 text-sm font-semibold">{grupo.titulo}</p>}
        {grupo.items.map(item => {
          const activo = item.href === '/admin' ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)
          return <Link key={item.href} href={item.href} onClick={alNavegar} aria-current={activo ? 'page' : undefined} className={`flex min-h-11 items-center rounded-md px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring ${activo ? 'bg-sidebar-accent font-bold text-sidebar-accent-foreground' : 'hover:bg-sidebar-accent'}`}>{item.etiqueta}</Link>
        })}
      </div>)}
    </nav>
    <div className="mt-4 flex items-center gap-3 border-t border-sidebar-border pt-4">
      <BotonTema />
      <form action={cerrarSesion.bind(null, 'admin')}><button type="submit" className="min-h-11 rounded-md px-3 text-sm font-semibold hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring">Cerrar sesión</button></form>
    </div>
  </aside>
}

export function NavegacionAdmin({ nombre }: { nombre: string }) {
  const [abierto, setAbierto] = useState(false)
  return <>
    <div className="fixed inset-y-0 left-0 hidden w-72 lg:block"><BarraLateral nombre={nombre} /></div>
    <header className="flex min-h-14 items-center gap-3 border-b border-border px-4 lg:hidden">
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogTrigger aria-label="Abrir menú" className="inline-flex size-11 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><Menu aria-hidden="true" /></DialogTrigger>
        <DialogContent showCloseButton={false} className="dark fixed inset-y-0 left-0 top-0 h-dvh w-72 max-w-[85vw] translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none bg-sidebar p-0 text-sidebar-foreground">
          <DialogTitle className="sr-only">Menú del panel de dueños</DialogTitle>
          <DialogClose aria-label="Cerrar menú" className="absolute right-2 top-2 inline-flex size-11 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-sidebar-ring"><X aria-hidden="true" /></DialogClose>
          <BarraLateral nombre={nombre} alNavegar={() => setAbierto(false)} />
        </DialogContent>
      </Dialog>
      <span className="font-heading font-semibold">{nombre}</span>
    </header>
  </>
}

'use client'

import { Moon, Sun } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { claveTema } from '@/lib/tema'
import { cn } from '@/lib/utils'

const evento = 'oasis-tema'
function subscribe(callback: () => void) {
  window.addEventListener(evento, callback)
  return () => window.removeEventListener(evento, callback)
}
function snapshot() { return document.documentElement.classList.contains('dark') }

export function BotonTema({ className }: { className?: string }) {
  const oscuro = useSyncExternalStore(subscribe, snapshot, () => false)
  function alternar() {
    const nuevo = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', nuevo)
    try { localStorage.setItem(claveTema(location.pathname), nuevo ? 'oscuro' : 'claro') } catch { /* El tema sigue funcionando durante esta visita. */ }
    window.dispatchEvent(new Event(evento))
  }
  return <button type="button" onClick={alternar} aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} className={cn('inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring', className)}>{oscuro ? <Sun aria-hidden="true" size={20} /> : <Moon aria-hidden="true" size={20} />}</button>
}

'use client'
import { useEffect, useState } from 'react'

export function useConexion(): boolean {
  const [conectado, setConectado] = useState(false)
  useEffect(() => {
    let activo = true
    let secuencia = 0
    const controladores = new Set<AbortController>()
    async function comprobar() {
      const actual = ++secuencia
      if (!navigator.onLine) { setConectado(false); return }
      const controlador = new AbortController()
      controladores.add(controlador)
      const timeout = setTimeout(() => controlador.abort(), 5000)
      try {
        const respuesta = await fetch('/api/salud', { cache: 'no-store', signal: controlador.signal })
        if (activo && actual === secuencia) setConectado(navigator.onLine && respuesta.ok)
      } catch {
        if (activo && actual === secuencia) setConectado(false)
      } finally { clearTimeout(timeout); controladores.delete(controlador) }
    }
    function cambio() { void comprobar() }
    void comprobar()
    const intervalo = setInterval(comprobar, 15000)
    window.addEventListener('online', cambio); window.addEventListener('offline', cambio)
    return () => { activo = false; clearInterval(intervalo); controladores.forEach(c => c.abort()); window.removeEventListener('online', cambio); window.removeEventListener('offline', cambio) }
  }, [])
  return conectado
}

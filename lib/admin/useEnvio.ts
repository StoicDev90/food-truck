'use client'

import { useRef, useState } from 'react'

export function useEnvio() {
  const [enviando, setEnviando] = useState(false)
  const ocupado = useRef(false)
  async function enviar<T>(fn: () => Promise<T>): Promise<T | undefined> {
    if (ocupado.current) return undefined
    ocupado.current = true
    setEnviando(true)
    try { return await fn() } finally { ocupado.current = false; setEnviando(false) }
  }
  return { enviando, enviar }
}

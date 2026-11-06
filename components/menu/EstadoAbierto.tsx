'use client'

import { useEffect, useState } from 'react'
import type { Horarios } from '@/lib/admin/horarios'
import { estadoNegocio, type EstadoNegocio } from '@/lib/menu/horario'

const dias = { lun: 'lunes', mar: 'martes', mie: 'miércoles', jue: 'jueves', vie: 'viernes', sab: 'sábado', dom: 'domingo' }

export function EstadoAbierto({ horarios }: { horarios: Horarios | null }) {
  const [estado, setEstado] = useState<EstadoNegocio | null>(null)
  useEffect(() => {
    const actualizar = () => setEstado(estadoNegocio(horarios, new Date()))
    actualizar()
    const intervalo = setInterval(actualizar, 60_000)
    return () => clearInterval(intervalo)
  }, [horarios])
  if (!estado) return null
  return <p className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-bold">
    {estado.abierto && <span aria-hidden="true" className="size-2 rounded-full bg-exito-texto" />}
    <span className={estado.abierto ? 'text-exito-texto' : ''}>{estado.abierto ? `Abierto · cierra ${estado.cierra}` : estado.abre ? `Cerrado · abre ${dias[estado.abre.dia]} ${estado.abre.hora}` : 'Cerrado'}</span>
  </p>
}

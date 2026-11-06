import { Suspense } from 'react'
import { cerrarSesion } from '@/lib/auth/acciones'
import { requerirAcceso } from '@/lib/auth/sesion'
import { cargarPos } from '@/lib/pos/datos'
import { AbrirTurno } from '@/components/pos/AbrirTurno'
import { Button } from '@/components/ui/button'

async function Contenido() {
  const perfil = await requerirAcceso('pos')
  const { turno, fondoSugerido } = await cargarPos()
  return <main className="flex flex-1 flex-col items-start gap-4 p-4">
    {!turno ? <AbrirTurno nombre={perfil.nombre} fondoSugerido={fondoSugerido} /> : <>
      <h1 className="text-xl font-semibold">Hola, {perfil.nombre}</h1>
      <form action={cerrarSesion.bind(null, 'pos')}><Button type="submit" variant="outline">Cerrar sesión</Button></form>
    </>}
  </main>
}

export default function Page() {
  return <Suspense fallback={null}><Contenido /></Suspense>
}

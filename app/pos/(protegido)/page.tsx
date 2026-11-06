import { Suspense } from 'react'
import { cerrarSesion } from '@/lib/auth/acciones'
import { requerirAcceso } from '@/lib/auth/sesion'
import { cargarPos } from '@/lib/pos/datos'
import { AbrirTurno } from '@/components/pos/AbrirTurno'
import { PantallaVenta } from '@/components/pos/PantallaVenta'
import { Button } from '@/components/ui/button'

async function Contenido() {
  const perfil = await requerirAcceso('pos')
  const datos = await cargarPos()
  if (!datos.turno) return <main className="flex flex-1 flex-col items-start gap-4 p-4"><AbrirTurno nombre={perfil.nombre} fondoSugerido={datos.fondoSugerido} /></main>
  if (perfil.rol === 'empleado' && datos.turno.empleadoId !== perfil.id) return <main className="flex flex-1 flex-col items-start gap-4 p-4"><p>Hay un turno abierto de {datos.turno.empleadoNombre}. Tiene que cerrarlo antes.</p><form action={cerrarSesion.bind(null, 'pos')}><Button type="submit" variant="outline">Cerrar sesión</Button></form></main>
  return <PantallaVenta datos={datos} />
}
export default function Page() { return <Suspense fallback={null}><Contenido /></Suspense> }

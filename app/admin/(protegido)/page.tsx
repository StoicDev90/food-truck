import { cerrarSesion } from '@/lib/auth/acciones'
import { requerirAcceso } from '@/lib/auth/sesion'
import { Button } from '@/components/ui/button'

export default async function Page() {
  const perfil = await requerirAcceso('admin')
  return (
    <main className="flex flex-1 flex-col items-start gap-4 p-4">
      <h1 className="text-xl font-semibold">Hola, {perfil.nombre}</h1>
      <form action={cerrarSesion.bind(null, 'admin')}>
        <Button type="submit" variant="outline">
          Cerrar sesión
        </Button>
      </form>
    </main>
  )
}

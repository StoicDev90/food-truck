import { requerirAcceso } from '@/lib/auth/sesion'
import { crearClienteServidor } from '@/lib/supabase/server'
import { TablaCategorias } from '@/components/admin/TablaCategorias'

export default async function Page() {
  await requerirAcceso('admin')
  const db = await crearClienteServidor()
  const { data, error } = await db.from('categorias').select('id,nombre,orden').order('orden')
  return <main className="space-y-6 p-4 sm:p-6"><h1 className="font-heading text-2xl font-semibold">Categorías</h1>{error ? <p role="alert">No se pudieron cargar las categorías. Probá de nuevo.</p> : <TablaCategorias categorias={data ?? []} />}</main>
}

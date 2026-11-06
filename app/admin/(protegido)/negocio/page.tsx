import { requerirAcceso } from '@/lib/auth/sesion'
import { crearClienteServidor } from '@/lib/supabase/server'
import { FormNegocio } from '@/components/admin/FormNegocio'

export default async function Page() {
  await requerirAcceso('admin')
  const db = await crearClienteServidor()
  const { data, error } = await db.from('configuracion').select('nombre,whatsapp,instagram,ubicacion,horarios,logo_path').eq('id', 1).single()
  return <main className="space-y-6 p-4 sm:p-6"><h1 className="font-heading text-2xl font-semibold">Negocio y menú</h1>{error || !data ? <p role="alert">No se pudieron cargar los datos del negocio. Probá de nuevo.</p> : <FormNegocio configuracion={data} />}</main>
}

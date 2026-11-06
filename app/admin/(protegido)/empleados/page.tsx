import { requerirAcceso } from '@/lib/auth/sesion'
import { crearClienteServidor } from '@/lib/supabase/server'
import { crearClienteAdmin } from '@/lib/supabase/admin'
import { claveCuentaEmpleado } from '@/lib/auth/claves-login'
import { FormEmpleado } from '@/components/admin/FormEmpleado'
import { TablaEmpleados } from '@/components/admin/TablaEmpleados'

function bloqueoVigente(hasta: string | null | undefined) {
  return hasta && Date.parse(hasta) > Date.now() ? hasta : null
}

export default async function Page() {
  await requerirAcceso('admin')
  const db = await crearClienteServidor()
  const perfiles = await db.from('perfiles').select('id,nombre,usuario,activo').eq('rol', 'empleado').order('nombre')
  if (perfiles.error) return <main className="p-6"><h1 className="font-heading text-2xl">Empleados</h1><p role="alert">No se pudo cargar empleados. Probá de nuevo.</p></main>
  const filas = perfiles.data.filter((p): p is typeof p & { usuario: string } => p.usuario !== null)
  const bloqueos = filas.length ? await crearClienteAdmin().from('intentos_login').select('clave,bloqueado_hasta').in('clave', filas.map(p => claveCuentaEmpleado(p.usuario))) : { data: [], error: null }
  if (bloqueos.error) return <main className="p-6"><h1 className="font-heading text-2xl">Empleados</h1><p role="alert">No se pudo cargar empleados. Probá de nuevo.</p></main>
  const empleados = filas.map(p => { const hasta = bloqueos.data.find(b => b.clave === claveCuentaEmpleado(p.usuario))?.bloqueado_hasta; return { ...p, bloqueadoHasta: bloqueoVigente(hasta) } })
  return <main className="space-y-6 p-4 sm:p-6"><h1 className="font-heading text-2xl font-semibold">Empleados</h1><FormEmpleado /><TablaEmpleados empleados={empleados} /></main>
}

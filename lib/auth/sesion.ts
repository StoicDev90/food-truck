import 'server-only'
import { redirect } from 'next/navigation'
import { crearClienteServidor } from '@/lib/supabase/server'
import { resolverAcceso, type Perfil, type Seccion } from './acceso'

export async function obtenerPerfil(): Promise<Perfil | null> {
  const supabase = await crearClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('perfiles')
    .select('id, nombre, rol, activo')
    .eq('id', user.id)
    .maybeSingle()
  return data
}

export async function requerirAcceso(seccion: Seccion): Promise<Perfil> {
  const perfil = await obtenerPerfil()
  if (!perfil || resolverAcceso(perfil, seccion) === 'login') redirect(`/${seccion}/login`)
  return perfil
}

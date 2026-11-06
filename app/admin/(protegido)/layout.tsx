import { Suspense, type ReactNode } from 'react'
import { connection } from 'next/server'
import { requerirAcceso } from '@/lib/auth/sesion'
import { crearClienteServidor } from '@/lib/supabase/server'
import { NavegacionAdmin } from '@/components/admin/BarraLateral'

async function Guard({ children }: { children: ReactNode }) {
  await connection()
  await requerirAcceso('admin')
  const db = await crearClienteServidor()
  const { data } = await db.from('configuracion').select('nombre').eq('id', 1).single()
  return <div className="min-h-dvh"><NavegacionAdmin nombre={data?.nombre ?? 'Oasis Itaipu'} /><div className="lg:pl-72">{children}</div></div>
}

export default function Layout({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}><Guard>{children}</Guard></Suspense>
}

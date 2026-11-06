import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

export async function crearClienteServidor(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(lista) {
          try {
            for (const { name, value, options } of lista) cookieStore.set(name, value, options)
          } catch {
            // Server Component: no puede escribir cookies; el proxy refresca la sesión.
          }
        },
      },
    },
  )
}

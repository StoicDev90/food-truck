import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'

// Rutas protegidas por sección; los redirects van siempre a paths fijos.
const SECCIONES = ['pos', 'admin'] as const

export async function actualizarSesion(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request })
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(lista) {
          for (const { name, value } of lista) request.cookies.set(name, value)
          response = NextResponse.next({ request })
          for (const { name, value, options } of lista) response.cookies.set(name, value, options)
        },
      },
    },
  )

  // getUser valida el JWT contra Supabase Auth (getSession no es confiable).
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  for (const seccion of SECCIONES) {
    const base = `/${seccion}`
    const enSeccion = path === base || path.startsWith(`${base}/`)
    const enLogin = path === `${base}/login` || path.startsWith(`${base}/login/`)
    if (enSeccion && !enLogin && !user) {
      const redirect = NextResponse.redirect(new URL(`${base}/login`, request.url))
      for (const c of response.cookies.getAll()) redirect.cookies.set(c)
      return redirect
    }
  }
  return response
}

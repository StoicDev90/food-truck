import { Suspense, type ReactNode } from 'react'
import { connection } from 'next/server'
import { requerirAcceso } from '@/lib/auth/sesion'

// cacheComponents: leer cookies() exige un límite <Suspense>. El guard corre
// antes de renderizar children: sin acceso, redirect() corta el render.
async function Guard({ children }: { children: ReactNode }) {
  await connection()
  await requerirAcceso('admin')
  return <>{children}</>
}

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <Guard>{children}</Guard>
    </Suspense>
  )
}

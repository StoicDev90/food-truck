import { requerirAcceso } from '@/lib/auth/sesion'

export default async function Page() {
  await requerirAcceso('admin')
  return <main className="p-4 sm:p-6"><h1 className="font-heading text-2xl font-semibold">Hoy</h1></main>
}

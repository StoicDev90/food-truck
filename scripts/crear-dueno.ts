import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

const [email, password, nombre] = process.argv.slice(2)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!email || !password || !nombre) {
  console.error('Uso: npx tsx scripts/crear-dueno.ts <email> <password> <nombre>')
  process.exit(1)
}
if (!url || !key) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno')
  process.exit(1)
}

const admin = createClient<Database>(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function main() {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw error

  const { error: e2 } = await admin
    .from('perfiles')
    .insert({ id: data.user.id, nombre, usuario: null, rol: 'dueno', activo: true })
  if (e2) {
    await admin.auth.admin.deleteUser(data.user.id)
    throw e2
  }
  console.log(`Dueño creado: ${email} (${data.user.id})`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

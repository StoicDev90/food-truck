import { execSync } from 'node:child_process'

const salida = execSync('npx supabase status -o env', { encoding: 'utf8' })
const vars: Record<string, string> = {}
for (const linea of salida.split('\n')) {
  const m = linea.match(/^([A-Z_]+)=(.*)$/)
  if (m) vars[m[1]] = m[2].trim().replace(/^"|"$/g, '')
}

process.env.SUPABASE_URL = vars.API_URL
process.env.SUPABASE_ANON_KEY = vars.ANON_KEY
process.env.SUPABASE_SERVICE_ROLE_KEY = vars.SERVICE_ROLE_KEY
process.env.SUPABASE_DB_URL = vars.DB_URL

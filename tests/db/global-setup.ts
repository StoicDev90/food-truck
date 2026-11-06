import { execSync } from 'node:child_process'

export default function setup() {
  execSync('npx supabase db reset', { stdio: 'inherit' })
}

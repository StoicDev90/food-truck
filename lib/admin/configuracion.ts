import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

export async function nombreNegocio(db: SupabaseClient<Database>): Promise<string> {
  const { data, error } = await db.from('configuracion').select('nombre').eq('id', 1).maybeSingle()
  if (error) throw error
  return data?.nombre ?? 'Oasis Itaipu'
}

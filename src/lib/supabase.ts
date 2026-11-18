import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/*
 * Cliente de Supabase (login, base de datos, fotos y la función de IA).
 * Las claves vienen de .env.local (ver .env.example). La "anon key" es pública por diseño:
 * la seguridad de los datos la dan las reglas RLS de supabase/migrations.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const clave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigurado = Boolean(url && clave)

export const supabase: SupabaseClient | null = supabaseConfigurado ? createClient(url!, clave!) : null

/** El cliente, o un error claro si falta configurar .env.local. */
export function db(): SupabaseClient {
  if (!supabase) throw new Error('Falta configurar Supabase: crea .env.local con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.')
  return supabase
}

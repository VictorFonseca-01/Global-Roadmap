import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Check your .env file.')
}

// Limpa a URL para evitar duplicação de /rest/v1 se o usuário colou a URL da API completa
const cleanUrl = supabaseUrl?.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')

export const supabase = createClient(cleanUrl || '', supabaseAnonKey || '')

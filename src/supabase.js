import { createClient } from '@supabase/supabase-js'

// ─── Cole aqui as suas credenciais do Supabase ───────────────────────────────
// Supabase → Settings → API → Project URL e anon public key
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY
// ─────────────────────────────────────────────────────────────────────────────

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    '❌ Credenciais do Supabase não encontradas.\n' +
    'Crie o arquivo .env na raiz do projeto com:\n' +
    'VITE_SUPABASE_URL=https://xxxx.supabase.co\n' +
    'VITE_SUPABASE_KEY=eyJhbGc...'
  )
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

/**
 * Cliente con service_role — bypassa RLS por completo. Solo se usa desde
 * Server Actions que ya verificaron explícitamente que quien llama es admin
 * (ver lib/actions/users.ts), y únicamente para operaciones que la API de
 * auth normal no permite: crear/borrar usuarios y cambiar su email sin el
 * flujo de confirmación. Nunca se importa desde código de cliente.
 */
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

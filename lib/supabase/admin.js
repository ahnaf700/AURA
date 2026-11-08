import { createClient } from '@supabase/supabase-js';

let client;
/** Klien service-role. HANYA dipakai di kode server. */
export function admin() {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

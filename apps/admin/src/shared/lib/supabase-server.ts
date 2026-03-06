import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabaseServer() {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return client;
}

export const supabaseServer = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabaseServer() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

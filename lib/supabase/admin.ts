import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * SERVER-SIDE ONLY. Uses the service role key, which can create/edit
 * auth users and bypasses Row Level Security entirely.
 *
 * Only ever import this file from files under app/api/** (Route Handlers).
 * Never import it from a "use client" component or anywhere that ships
 * to the browser bundle — the service role key must never reach the client.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

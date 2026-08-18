import { createBrowserClient } from "@supabase/ssr";

/**
 * Use this client inside "use client" components only.
 * It reads the public anon key, never the service role key.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

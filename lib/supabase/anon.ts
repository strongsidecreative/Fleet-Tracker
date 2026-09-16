import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * A plain anon-key client — no cookies, no session persistence, and
 * critically, NOT built with @supabase/ssr's createBrowserClient/
 * createServerClient. Both of those hardcode `flowType: "pkce"` with no
 * way to override it, which is exactly wrong for a server action that
 * triggers an auth email on someone else's behalf: PKCE requires the
 * code_verifier it generates to be read back by the SAME browser/session
 * that made the request, but here that's the admin clicking "resend
 * invite" — the actual recipient opens the email on their own device,
 * which never had that verifier and can never redeem the code. That
 * mismatch is what was breaking every admin-triggered reset/reinvite
 * link, 100% of the time, regardless of spam filters or link-scanning.
 *
 * This client has no flowType override forced on it, so it falls back to
 * the SDK default ("implicit") — the same default createAdminClient()
 * already gets, which is why the original admin.inviteUserByEmail invite
 * links have always worked fine. Using this for resetPasswordForEmail
 * makes resent/reactivation links behave the same way: self-contained
 * tokens in the link itself, redeemable from any device.
 *
 * Anon key only — safe to use from any server code, but keep it there;
 * it has no more privilege than a logged-out visitor.
 */
export function createAnonClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

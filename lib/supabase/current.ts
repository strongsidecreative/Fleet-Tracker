import { cache } from "react";
import { createClient } from "./server";

/**
 * Per-request helpers for the signed-in viewer, shared by a route's layout
 * and page (React cache() dedupes within one server render).
 *
 * getCurrentUser reads the session from the cookie with getSession(), no
 * network call. That's safe for these routes because middleware.ts has
 * already validated the same cookie with auth.getUser() (a real check
 * against Supabase Auth) on this very request, and every database read
 * still goes through RLS, which verifies the JWT signature itself.
 * Server Actions that change data keep using auth.getUser() directly.
 *
 * Before this, a driver tab did auth.getUser() in the layout AND again in
 * the page, then a separate profiles query in each: 4 extra round trips
 * to Supabase per tap, on top of the page's real data.
 */
export const getCurrentUser = cache(async () => {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
});

export type MyProfile = {
  id: string;
  name: string | null;
  email: string;
  role: "admin" | "driver";
  active: boolean;
  organisation_id: string | null;
  organisation: { features?: unknown } | { features?: unknown }[] | null;
};

/** The viewer's own profile row plus their organisation's feature flags, fetched once per request. */
export const getMyProfile = cache(async (): Promise<MyProfile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, name, email, role, active, organisation_id, organisation:organisations(features)")
    .eq("id", user.id)
    .single();
  return (data as MyProfile | null) ?? null;
});

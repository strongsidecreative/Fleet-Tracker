import type { SupabaseClient } from "@supabase/supabase-js";
import { normaliseFeatures, type FeatureKey } from "./orgFeatures";
import { getMyProfile } from "./supabase/current";

/**
 * Reads the current viewer's organisation feature flags, for use in
 * server components/actions deciding whether to render a link or button
 * that leads to a toggleable feature. This is a convenience/UX layer
 * only — the real enforcement (blocking direct URL access and Server
 * Action posts) happens in middleware.ts. Always returns a complete,
 * safely-defaulted object; never throws.
 */
export async function getViewerFeatures(
  supabase: SupabaseClient,
  userId: string
): Promise<Record<FeatureKey, boolean>> {
  // Normal case: it's the viewer's own flags, so reuse the profile row
  // this request has already fetched (or will) instead of querying again.
  try {
    const mine = await getMyProfile();
    if (mine && mine.id === userId) {
      const rawMine = mine.organisation as unknown;
      const orgMine = Array.isArray(rawMine) ? rawMine[0] : rawMine;
      return normaliseFeatures((orgMine as { features?: unknown } | null | undefined)?.features);
    }
  } catch {
    // Outside a request scope (shouldn't happen) — fall through to a direct query.
  }

  const { data } = await supabase
    .from("profiles")
    .select("organisation:organisations(features)")
    .eq("id", userId)
    .single();

  // Supabase's query builder types this join as an array even though the
  // FK makes it a single row at runtime — same caveat as OrganisationCard
  // in app/admin/account/page.tsx.
  const raw = data?.organisation as unknown;
  const org = Array.isArray(raw) ? raw[0] : raw;
  return normaliseFeatures((org as { features?: unknown } | null | undefined)?.features);
}

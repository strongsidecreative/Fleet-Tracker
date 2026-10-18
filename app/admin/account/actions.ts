"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRIVATE_BUCKET, PUBLIC_BUCKET, removePhotos } from "@/lib/photos";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_FEATURES, type FeatureKey } from "@/lib/orgFeatures";
import { revalidatePath } from "next/cache";

type ActionState = { error: string | null };

export async function renameOrganisation(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role, organisation_id")
    .eq("id", user!.id)
    .single();

  if (callerProfile?.role !== "admin" || !callerProfile.organisation_id) {
    return { error: "Only admins can rename the organisation." };
  }

  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    return { error: "Organisation name can't be empty." };
  }

  // Goes through the normal authenticated client, not the service-role
  // one — RLS's "Admins can rename their own organisation" policy (added
  // in migration 0013) is what actually enforces that an admin can only
  // ever rename their own organisation, never anyone else's.
  const { error } = await supabase.from("organisations").update({ name }).eq("id", callerProfile.organisation_id);

  if (error) {
    return { error: "Something went wrong renaming the organisation. Please try again." };
  }

  revalidatePath("/admin/account");
  return { error: null };
}

export async function updateOrgFeatures(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role, organisation_id")
    .eq("id", user!.id)
    .single();

  if (callerProfile?.role !== "admin" || !callerProfile.organisation_id) {
    return { error: "Only admins can change feature settings." };
  }

  // Unchecked checkboxes are simply absent from FormData — treat "not
  // present" as false rather than trying to read a value that isn't there.
  const features: Record<FeatureKey, boolean> = { ...DEFAULT_FEATURES };
  (Object.keys(DEFAULT_FEATURES) as FeatureKey[]).forEach((key) => {
    features[key] = formData.get(key) === "on";
  });

  const { error } = await supabase
    .from("organisations")
    .update({ features })
    .eq("id", callerProfile.organisation_id);

  if (error) {
    return { error: "Something went wrong saving feature settings. Please try again." };
  }

  // These are the pages/nav whose visibility depends on the flags just
  // changed — revalidate them so the change is visible immediately
  // rather than waiting for their normal cache window.
  revalidatePath("/admin/account");
  revalidatePath("/admin");
  revalidatePath("/");
  return { error: null };
}

/** Every file path under a Storage folder (Storage's list() isn't recursive). */
async function listFilesUnder(admin: SupabaseClient, bucket: string, folder: string, depth = 0): Promise<string[]> {
  if (depth > 4) return [];
  const out: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.storage.from(bucket).list(folder, { limit: 1000, offset });
    if (error || !data || data.length === 0) break;
    for (const item of data) {
      const path = `${folder}/${item.name}`;
      // Folders come back with no id; files have one.
      if (item.id) out.push(path);
      else out.push(...(await listFilesUnder(admin, bucket, path, depth + 1)));
    }
    if (data.length < 1000) break;
  }
  return out;
}

type DeleteState = { error: string | null; redirectTo?: string };

/**
 * Permanently deletes the caller's whole organisation: every person and
 * their sign-in, every vehicle, trip, booking, check, incident, fuel log,
 * notification and audit entry (SQL function delete_organisation,
 * migration 0027), then the photo files in Storage. Cannot be undone.
 *
 * Guarded three ways: caller must be an active admin of the organisation,
 * must type the organisation's exact name, and the SQL function itself is
 * only callable with the service role key.
 */
export async function deleteOrganisation(prevState: DeleteState, formData: FormData): Promise<DeleteState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in to do that." };

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role, active, organisation_id, organisation:organisations(name)")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "admin" || !callerProfile.active || !callerProfile.organisation_id) {
    return { error: "Only an admin can delete the organisation." };
  }
  const orgRaw = callerProfile.organisation as unknown;
  const org = (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw) as { name?: string } | null;
  const orgName = (org?.name ?? "").trim();

  const typed = ((formData.get("confirmName") as string) ?? "").trim();
  if (!orgName || typed.toLowerCase() !== orgName.toLowerCase()) {
    return { error: `Type the organisation name exactly ("${orgName}") to confirm.` };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: "The service role key isn't set up, so the organisation can't be deleted. Add SUPABASE_SERVICE_ROLE_KEY (see README)." };
  }
  const admin = createAdminClient();
  const orgId = callerProfile.organisation_id as string;

  // Find photo files BEFORE the rows that reference them are deleted:
  // stored references (covers older public URLs) plus everything under
  // the organisation's Storage folders.
  const [vehicles, fuel, incidents, checkItems, publicFiles, privateFiles] = await Promise.all([
    admin.from("vehicles").select("photo_url").eq("organisation_id", orgId).not("photo_url", "is", null),
    admin.from("fuel_logs").select("receipt_photo_url").eq("organisation_id", orgId).not("receipt_photo_url", "is", null),
    admin.from("incident_reports").select("photo_url").eq("organisation_id", orgId).not("photo_url", "is", null),
    admin.from("vehicle_check_items").select("photo_url").eq("organisation_id", orgId).not("photo_url", "is", null),
    listFilesUnder(admin, PUBLIC_BUCKET, `vehicles/${orgId}`),
    listFilesUnder(admin, PRIVATE_BUCKET, orgId),
  ]);
  const photoRefs: (string | null)[] = [
    ...(vehicles.data ?? []).map((r: { photo_url: string }) => r.photo_url),
    ...(fuel.data ?? []).map((r: { receipt_photo_url: string }) => r.receipt_photo_url),
    ...(incidents.data ?? []).map((r: { photo_url: string }) => r.photo_url),
    ...(checkItems.data ?? []).map((r: { photo_url: string }) => r.photo_url),
  ];

  const { error } = await admin.rpc("delete_organisation", { p_org: orgId });
  if (error) {
    return { error: `Nothing was deleted, something went wrong: ${error.message}` };
  }

  // Data and accounts are gone; now the files (best effort).
  await removePhotos(admin, photoRefs);
  for (const [bucket, paths] of [
    [PUBLIC_BUCKET, publicFiles],
    [PRIVATE_BUCKET, privateFiles],
  ] as const) {
    for (let i = 0; i < paths.length; i += 100) {
      const { error: rmError } = await admin.storage.from(bucket).remove(paths.slice(i, i + 100));
      if (rmError) console.error("deleteOrganisation: storage cleanup failed", bucket, rmError.message);
    }
  }

  // Their sign-in no longer exists; clear the session cookies too.
  await supabase.auth.signOut().catch(() => undefined);
  revalidatePath("/", "layout");
  return { error: null, redirectTo: "/login?deleted=1" };
}

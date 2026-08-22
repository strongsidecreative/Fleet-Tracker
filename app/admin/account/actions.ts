"use server";

import { createClient } from "@/lib/supabase/server";
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

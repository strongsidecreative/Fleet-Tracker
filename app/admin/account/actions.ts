"use server";

import { createClient } from "@/lib/supabase/server";
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

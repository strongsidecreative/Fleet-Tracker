"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ActionState = { error: string | null };

export async function upsertLicence(driverId: string, prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: callerProfile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (callerProfile?.role !== "admin") {
    return { error: "Only admins can manage licence information." };
  }

  const licenceNumber = (formData.get("licenceNumber") as string)?.trim();
  const versionNumber = (formData.get("versionNumber") as string)?.trim() || null;
  const licenceClass = (formData.get("licenceClass") as string)?.trim() || null;
  const expiryDate = formData.get("expiryDate") as string;

  if (!licenceNumber || !expiryDate) {
    return { error: "Licence number and expiry date are required." };
  }

  const { error } = await supabase.from("driver_licences").upsert(
    {
      driver_id: driverId,
      licence_number: licenceNumber,
      version_number: versionNumber,
      licence_class: licenceClass,
      expiry_date: expiryDate,
      updated_by: user!.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "driver_id" }
  );

  if (error) {
    return { error: "Something went wrong saving the licence details. Please try again." };
  }

  revalidatePath(`/admin/drivers/${driverId}`);
  revalidatePath("/admin/drivers");
  return { error: null };
}

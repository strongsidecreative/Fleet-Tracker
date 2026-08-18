"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createIncidentFromCheckItem(checkId: string, itemId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: callerProfile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (callerProfile?.role !== "admin") {
    return;
  }

  // Already actioned — don't create a duplicate incident for the same issue.
  const { data: existing } = await supabase
    .from("incident_reports")
    .select("id")
    .eq("source_vehicle_check_item_id", itemId)
    .maybeSingle();
  if (existing) {
    revalidatePath(`/admin/vehicle-checks/${checkId}`);
    return;
  }

  const { data: check } = await supabase
    .from("vehicle_checks")
    .select("vehicle_id, driver_id, check_type")
    .eq("id", checkId)
    .single();
  const { data: item } = await supabase
    .from("vehicle_check_items")
    .select("item_label, comment, photo_url")
    .eq("id", itemId)
    .single();

  if (!check || !item) {
    return;
  }

  await supabase.from("incident_reports").insert({
    vehicle_id: check.vehicle_id,
    driver_id: check.driver_id,
    description: `${item.item_label}${item.comment ? `: ${item.comment}` : ""} (from ${check.check_type}-operation Vehicle Check)`,
    severity: "medium",
    photo_url: item.photo_url,
    report_type: "incident",
    source_vehicle_check_item_id: itemId,
    created_by: user!.id,
  });

  revalidatePath(`/admin/vehicle-checks/${checkId}`);
  revalidatePath("/admin/incidents");
}

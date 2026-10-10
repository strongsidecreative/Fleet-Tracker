"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateIncidentStatus(incidentId: string, status: string) {
  const supabase = createClient();
  if (!["new", "acknowledged", "resolved"].includes(status)) return;
  const { data, error } = await supabase.from("incident_reports").update({ status }).eq("id", incidentId).select("id");
  if (error || !data || data.length === 0) {
    console.error("updateIncidentStatus changed nothing", incidentId, error?.message);
  }
  revalidatePath("/admin/incidents");
}

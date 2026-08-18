"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateIncidentStatus(incidentId: string, status: string) {
  const supabase = createClient();
  await supabase.from("incident_reports").update({ status }).eq("id", incidentId);
  revalidatePath("/admin/incidents");
}

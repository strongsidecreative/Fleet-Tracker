"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ActionState = { error: string | null };

export async function closeSession(tripId: string, prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const kmRaw = formData.get("km") as string;
  const km = Number(kmRaw);

  if (!kmRaw || Number.isNaN(km)) {
    return { error: "Please enter the ending kilometre reading." };
  }

  const { data: trip } = await supabase.from("vehicle_usage").select("*").eq("id", tripId).single();

  const { error } = await supabase
    .from("vehicle_usage")
    .update({ end_km: km, end_datetime: new Date().toISOString(), status: "corrected" })
    .eq("id", tripId);

  if (error) {
    if (error.message.includes("end_km_not_below_start")) {
      return { error: "Ending KM can't be below the starting KM." };
    }
    return { error: "Something went wrong closing this trip. Please try again." };
  }

  await supabase.from("audit_log").insert({
    user_id: user!.id,
    record_type: "vehicle_usage",
    record_id: tripId,
    action: "admin_closed_open_session",
    old_value: { end_km: trip?.end_km ?? null, status: trip?.status },
    new_value: { end_km: km, status: "corrected" },
  });

  revalidatePath("/admin/sessions");
  revalidatePath("/admin/records");
  return { error: null };
}

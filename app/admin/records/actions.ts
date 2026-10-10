"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ActionState = { error: string | null; ok?: string | null };

function readKm(formData: FormData, name: string): number | null {
  const raw = String(formData.get(name) ?? "").replace(/[\s,]/g, "");
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

// Fix a trip's KM (e.g. 100072 typed for 10072). The database function
// (migration 0025) checks the caller is an admin in the trip's
// organisation, resets the vehicle's odometer from its latest trip and
// writes the audit log.
export async function correctTripKm(tripId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const startKm = readKm(formData, "start_km");
  const endKm = readKm(formData, "end_km");
  const reason = String(formData.get("reason") ?? "").slice(0, 200);

  if (startKm === null || Number.isNaN(startKm)) return { error: "Enter the starting KM." };
  if (endKm !== null && Number.isNaN(endKm)) return { error: "Ending KM must be a number." };

  const supabase = createClient();
  const { data, error } = await supabase.rpc("correct_trip_km", {
    p_trip_id: tripId,
    p_start_km: startKm,
    p_end_km: endKm,
    p_reason: reason || null,
  });

  if (error) {
    if (error.code === "PGRST202" || error.message.includes("correct_trip_km")) {
      return { error: "KM correction isn't set up yet (database update 0025 needed)." };
    }
    return { error: error.message };
  }

  const row = (Array.isArray(data) ? data[0] : data) as { new_odometer: number | null } | undefined;
  revalidatePath("/admin/records");
  revalidatePath("/", "layout");
  return {
    error: null,
    ok:
      row?.new_odometer != null
        ? `Saved. Vehicle odometer is now ${Number(row.new_odometer).toLocaleString("en-NZ")} KM.`
        : "Saved.",
  };
}

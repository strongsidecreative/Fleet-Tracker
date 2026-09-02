"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ActionState = { error: string | null; success?: boolean };

// Fuel logging is only ever done from the driver's own "Current Vehicle"
// card, mid-trip — never against a parked vehicle, by a driver or an
// admin. The form only ever renders that way, but this is the actual
// enforcement: without a matching active vehicle_usage row for this
// driver and vehicle, the insert is refused, regardless of what a
// crafted request claims.
export async function logFuel(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You've been logged out. Please log in again." };
  }

  const vehicleId = formData.get("vehicleId") as string;
  const tripId = formData.get("tripId") as string;
  if (!vehicleId || !tripId) {
    return { error: "You need a vehicle checked out to log fuel." };
  }

  const { data: activeTrip } = await supabase
    .from("vehicle_usage")
    .select("id")
    .eq("id", tripId)
    .eq("vehicle_id", vehicleId)
    .eq("driver_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!activeTrip) {
    return { error: "That trip isn't active any more. Fuel can only be logged while a vehicle is checked out." };
  }

  const costRaw = formData.get("cost");
  const cost = Number(costRaw);
  if (!costRaw || Number.isNaN(cost) || cost < 0) {
    return { error: "Please enter the total amount paid." };
  }

  const litresRaw = formData.get("litres");
  let litres: number | null = null;
  if (litresRaw && String(litresRaw).trim() !== "") {
    litres = Number(litresRaw);
    if (Number.isNaN(litres) || litres <= 0) {
      return { error: "Litres, if entered, needs to be a number greater than 0." };
    }
  }

  let receiptPhotoUrl: string | null = null;
  const receipt = formData.get("receipt") as File | null;
  if (receipt && receipt.size > 0) {
    const ext = receipt.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
    const path = `fuel/${user.id}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("vehicle-photos")
      .upload(path, receipt, { contentType: receipt.type });
    if (!uploadError) {
      receiptPhotoUrl = supabase.storage.from("vehicle-photos").getPublicUrl(path).data.publicUrl;
    }
  }

  const { error } = await supabase.from("fuel_logs").insert({
    vehicle_id: vehicleId,
    driver_id: user.id,
    trip_id: tripId,
    litres,
    cost,
    receipt_photo_url: receiptPhotoUrl,
  });

  if (error) {
    return { error: "Something went wrong saving this fuel log. Please try again." };
  }

  revalidatePath("/");
  revalidatePath("/fuel");
  return { error: null, success: true };
}

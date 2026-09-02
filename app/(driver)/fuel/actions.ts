"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type ActionState = { error: string | null };

export async function logFuel(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You've been logged out. Please log in again." };
  }

  const vehicleId = formData.get("vehicleId") as string;
  if (!vehicleId) return { error: "Please select a vehicle." };

  const odometerRaw = formData.get("odometerKm");
  const odometerKm = Number(odometerRaw);
  if (!odometerRaw || Number.isNaN(odometerKm) || odometerKm < 0) {
    return { error: "Please enter the kilometre reading shown on the vehicle." };
  }

  const litresRaw = formData.get("litres");
  const litres = Number(litresRaw);
  if (!litresRaw || Number.isNaN(litres) || litres <= 0) {
    return { error: "Please enter how many litres you put in." };
  }

  const costRaw = formData.get("cost");
  const cost = Number(costRaw);
  if (!costRaw || Number.isNaN(cost) || cost < 0) {
    return { error: "Please enter the total amount paid." };
  }

  const notes = (formData.get("notes") as string)?.trim() || null;

  // Same "read fresh, never trust the client" pattern as vehicle checks —
  // just used here to confirm the vehicle actually exists before we
  // bother uploading a receipt for it.
  const { data: vehicle } = await supabase.from("vehicles").select("id").eq("id", vehicleId).single();
  if (!vehicle) return { error: "That vehicle couldn't be found. Please try again." };

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
    odometer_km: odometerKm,
    litres,
    cost,
    receipt_photo_url: receiptPhotoUrl,
    notes,
  });

  if (error) {
    return { error: "Something went wrong saving this fuel log. Please try again." };
  }

  redirect("/fuel?success=Fuel logged");
}

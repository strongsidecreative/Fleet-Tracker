"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

type ActionState = { error: string | null };

export async function createVehicle(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = createClient();

  const name = formData.get("name") as string;
  const registration = formData.get("registration") as string;
  const make = (formData.get("make") as string) || null;
  const model = (formData.get("model") as string) || null;
  const odometerRaw = formData.get("odometer") as string;
  const rucRaw = formData.get("ruc") as string;

  if (!name?.trim() || !registration?.trim() || !odometerRaw) {
    return { error: "Name, registration, and starting odometer are all required." };
  }

  const odometer = Number(odometerRaw);
  if (Number.isNaN(odometer) || odometer < 0) {
    return { error: "Starting odometer must be a valid number." };
  }

  const ruc = rucRaw ? Number(rucRaw) : null;
  if (rucRaw && Number.isNaN(ruc as number)) {
    return { error: "RUC purchased-to reading must be a valid number." };
  }

  const { error } = await supabase.from("vehicles").insert({
    name: name.trim(),
    registration: registration.trim(),
    make,
    model,
    current_odometer: odometer,
    ruc_purchased_to_km: ruc,
  });

  if (error) {
    return { error: "Something went wrong adding this vehicle. Please try again." };
  }

  revalidatePath("/admin/vehicles");
  redirect("/admin/vehicles?success=Vehicle added");
}

export async function updateVehicle(vehicleId: string, prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = createClient();

  const wofDue = (formData.get("wofDue") as string) || null;
  const regoDue = (formData.get("regoDue") as string) || null;
  const rucRaw = formData.get("ruc") as string;
  const serviceDueDate = (formData.get("serviceDueDate") as string) || null;
  const serviceDueKmRaw = formData.get("serviceDueKm") as string;
  const lastServiceDate = (formData.get("lastServiceDate") as string) || null;
  const lastServiceOdometerRaw = formData.get("lastServiceOdometer") as string;
  const currentOdometerRaw = formData.get("currentOdometer") as string;
  const active = formData.get("active") === "on";
  const photo = formData.get("photo") as File | null;

  let photoUrl: string | undefined;

  if (photo && photo.size > 0) {
    if (!photo.type.startsWith("image/")) {
      return { error: "Please upload an image file for the vehicle photo." };
    }
    if (photo.size > 5 * 1024 * 1024) {
      return { error: "Photo is too large — please use an image under 5MB." };
    }

    const ext = photo.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
    const path = `${vehicleId}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("vehicle-photos")
      .upload(path, photo, { contentType: photo.type, upsert: true });

    if (uploadError) {
      return { error: "Something went wrong uploading the photo. Please try again." };
    }

    photoUrl = supabase.storage.from("vehicle-photos").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase
    .from("vehicles")
    .update({
      wof_due: wofDue,
      rego_due: regoDue,
      ruc_purchased_to_km: rucRaw ? Number(rucRaw) : null,
      service_due_date: serviceDueDate,
      service_due_km: serviceDueKmRaw ? Number(serviceDueKmRaw) : null,
      last_service_date: lastServiceDate,
      last_service_odometer: lastServiceOdometerRaw ? Number(lastServiceOdometerRaw) : null,
      current_odometer: currentOdometerRaw ? Number(currentOdometerRaw) : undefined,
      active,
      ...(photoUrl ? { photo_url: photoUrl } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", vehicleId);

  if (error) {
    return { error: "Something went wrong saving these changes. Please try again." };
  }

  revalidatePath("/admin/vehicles");
  redirect("/admin/vehicles?success=Vehicle updated");
}

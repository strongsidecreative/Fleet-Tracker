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

  const { data: newVehicle, error } = await supabase
    .from("vehicles")
    .insert({
      name: name.trim(),
      registration: registration.trim(),
      make,
      model,
      current_odometer: odometer,
      ruc_purchased_to_km: ruc,
    })
    .select("id")
    .single();

  if (error || !newVehicle) {
    return { error: "Something went wrong adding this vehicle. Please try again." };
  }

  revalidatePath("/admin/vehicles");
  redirect(`/admin/vehicles/${newVehicle.id}/qr?success=${encodeURIComponent("Vehicle added. Here's its QR code.")}`);
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

/**
 * Removes a vehicle from the active fleet without touching any of its
 * history — every trip, booking, check and fuel log stays exactly as it
 * is, same effect as unchecking "Vehicle is active" on the edit form
 * above and saving. Kept as its own one-click action (rather than making
 * admins go through the full edit form) so "Remove Vehicle" can offer
 * this side by side with the permanent option below. Reversible any
 * time from that same checkbox.
 */
export async function archiveVehicle(vehicleId: string): Promise<{ error: string | null }> {
  const supabase = createClient();

  const { error } = await supabase
    .from("vehicles")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", vehicleId);

  if (error) {
    return { error: "Something went wrong removing this vehicle from the fleet. Please try again." };
  }

  revalidatePath("/admin/vehicles");
  revalidatePath(`/admin/vehicles/${vehicleId}`);
  return { error: null };
}

export async function archiveVehicleFromAdmin(vehicleId: string) {
  const result = await archiveVehicle(vehicleId);
  if (result.error) {
    redirect(`/admin/vehicles/${vehicleId}?error=${encodeURIComponent(result.error)}`);
  }
  redirect(`/admin/vehicles?success=${encodeURIComponent("Vehicle removed from the fleet. Its history is untouched.")}`);
}

/**
 * Hard-deletes a vehicle and every record that points at it. No ON
 * DELETE CASCADE is set up on these foreign keys, on purpose — this app
 * treats trip/booking/check/fuel history as permanent by default (see
 * e.g. fuel_logs' own "financial record, immutable" reasoning elsewhere),
 * so a full cascade needs to be a deliberate, explicit action taken here,
 * not a side effect of a schema constraint an admin might not know
 * about. archiveVehicle above is the non-destructive alternative.
 *
 * Order matters — children before parents:
 * 1. incident_reports — some rows reference vehicle_check_items via
 *    source_vehicle_check_item_id (no cascade on that FK), so those need
 *    to be gone before vehicle_checks/vehicle_check_items are deleted.
 * 2. vehicle_checks — vehicle_check_items cascades automatically (it's
 *    declared ON DELETE CASCADE from vehicle_checks in migration 0007).
 * 3. fuel_logs — a fuel log's optional trip_id references
 *    vehicle_usage(id) with no cascade, so this must go before step 5.
 * 4. bookings and booking_series — order doesn't matter between these
 *    two, both just need to be before vehicle_usage/vehicles.
 * 5. vehicle_usage (trip history), then the vehicle row itself, last.
 */
export async function deleteVehicleAndRecords(vehicleId: string): Promise<{ error: string | null }> {
  const supabase = createClient();

  const { data: activeTrip } = await supabase
    .from("vehicle_usage")
    .select("id")
    .eq("vehicle_id", vehicleId)
    .eq("status", "active")
    .maybeSingle();

  if (activeTrip) {
    return { error: "This vehicle has an active trip right now — it needs to be checked back in before it can be deleted." };
  }

  const deleteSteps: Array<{ label: string; run: () => Promise<{ error: { message: string } | null }> }> = [
    { label: "incident reports", run: async () => await supabase.from("incident_reports").delete().eq("vehicle_id", vehicleId) },
    { label: "vehicle checks", run: async () => await supabase.from("vehicle_checks").delete().eq("vehicle_id", vehicleId) },
    { label: "fuel logs", run: async () => await supabase.from("fuel_logs").delete().eq("vehicle_id", vehicleId) },
    { label: "bookings", run: async () => await supabase.from("bookings").delete().eq("vehicle_id", vehicleId) },
    { label: "recurring booking series", run: async () => await supabase.from("booking_series").delete().eq("vehicle_id", vehicleId) },
    { label: "trip history", run: async () => await supabase.from("vehicle_usage").delete().eq("vehicle_id", vehicleId) },
  ];

  for (const step of deleteSteps) {
    const { error } = await step.run();
    if (error) {
      return {
        error: `Something went wrong deleting this vehicle's ${step.label} (nothing further was deleted): ${error.message}`,
      };
    }
  }

  const { error } = await supabase.from("vehicles").delete().eq("id", vehicleId);
  if (error) {
    return {
      error: "Every record for this vehicle was deleted, but removing the vehicle itself failed. Please try again.",
    };
  }

  revalidatePath("/admin/vehicles");
  return { error: null };
}

export async function deleteVehicleAndRecordsFromAdmin(vehicleId: string) {
  const result = await deleteVehicleAndRecords(vehicleId);
  if (result.error) {
    redirect(`/admin/vehicles/${vehicleId}?error=${encodeURIComponent(result.error)}`);
  }
  redirect(`/admin/vehicles?success=${encodeURIComponent("Vehicle and all its records deleted.")}`);
}

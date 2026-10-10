"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PUBLIC_BUCKET, fileExtension, removePhotos } from "@/lib/photos";

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

  const name = (formData.get("name") as string | null)?.trim();
  const registration = (formData.get("registration") as string | null)?.trim();
  const make = (formData.get("make") as string | null)?.trim() || null;
  const model = (formData.get("model") as string | null)?.trim() || null;
  if (name === "" || registration === "") {
    return { error: "Name and registration can't be empty." };
  }

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
  let previousPhoto: string | null = null;

  if (photo && photo.size > 0) {
    if (!photo.type.startsWith("image/")) {
      return { error: "Please upload an image file for the vehicle photo." };
    }
    if (photo.size > 4 * 1024 * 1024) {
      return { error: "Photo is too large. Please use an image under 4MB." };
    }

    // Organisation folder (migration 0023): Storage only lets an admin
    // upload into, replace or delete photos under their own organisation.
    const { data: current } = await supabase
      .from("vehicles")
      .select("organisation_id, photo_url")
      .eq("id", vehicleId)
      .single();
    if (!current) {
      return { error: "That vehicle couldn't be found." };
    }
    previousPhoto = current.photo_url;
    const path = `vehicles/${current.organisation_id}/${vehicleId}-${Date.now()}.${fileExtension(photo)}`;

    const { error: uploadError } = await supabase.storage
      .from(PUBLIC_BUCKET)
      .upload(path, photo, { contentType: photo.type });

    if (uploadError) {
      return { error: "Something went wrong uploading the photo. Please try again." };
    }

    photoUrl = supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  const { data: saved, error } = await supabase
    .from("vehicles")
    .update({
      ...(name ? { name } : {}),
      ...(registration ? { registration } : {}),
      ...(formData.has("make") ? { make } : {}),
      ...(formData.has("model") ? { model } : {}),
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
    .eq("id", vehicleId)
    .select("id");

  if (error || !saved || saved.length === 0) {
    return { error: "Something went wrong saving these changes. Please try again." };
  }

  // Replaced photo: remove the old file so it stops using storage.
  if (photoUrl && previousPhoto && previousPhoto !== photoUrl && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await removePhotos(createAdminClient(), [previousPhoto]);
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

  const { data: archived, error } = await supabase
    .from("vehicles")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", vehicleId)
    .select("id");

  // RLS makes a blocked update return no error and zero rows, so check
  // a row really changed rather than reporting success on a no-op.
  if (error || !archived || archived.length === 0) {
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

  // There are deliberately no DELETE RLS policies on vehicles or any of the
  // history tables (history is permanent by default), so deleting through
  // the signed-in admin's client silently deleted zero rows and still
  // reported success. Confirmed live 2026-09-27. Instead: check the caller
  // is an admin in the same organisation as this vehicle, then do the
  // deletes with the service role key.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in to do that." };

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role, organisation_id")
    .eq("id", user.id)
    .single();
  if (callerProfile?.role !== "admin") return { error: "You're not authorised to do that." };

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: "The service role key isn't set up yet, so vehicles can't be deleted. Add SUPABASE_SERVICE_ROLE_KEY to your environment (see README), then try again." };
  }
  const admin = createAdminClient();

  const { data: vehicle } = await admin.from("vehicles").select("id, organisation_id, photo_url").eq("id", vehicleId).maybeSingle();
  if (!vehicle || vehicle.organisation_id !== callerProfile.organisation_id) {
    return { error: "You're not authorised to do that." };
  }

  const { data: activeTrip } = await admin
    .from("vehicle_usage")
    .select("id")
    .eq("vehicle_id", vehicleId)
    .eq("status", "active")
    .maybeSingle();

  if (activeTrip) {
    return { error: "This vehicle has an active trip right now — it needs to be checked back in before it can be deleted." };
  }

  // Rows elsewhere that point at this vehicle's trips or check items
  // (another vehicle's booking linked to one of these trips, an incident
  // raised from one of these check items) get unlinked, not deleted.
  const { data: trips } = await admin.from("vehicle_usage").select("id").eq("vehicle_id", vehicleId);
  const tripIds = (trips ?? []).map((t: { id: string }) => t.id);
  const { data: checks } = await admin.from("vehicle_checks").select("id").eq("vehicle_id", vehicleId);
  const checkIds = (checks ?? []).map((c: { id: string }) => c.id);
  let checkItemIds: string[] = [];
  if (checkIds.length > 0) {
    const { data: items } = await admin.from("vehicle_check_items").select("id").in("check_id", checkIds);
    checkItemIds = (items ?? []).map((i: { id: string }) => i.id);
  }

  // Photo files attached to anything being deleted, removed from Storage
  // once the rows are gone (otherwise they'd sit there using free space).
  const [{ data: fuelPhotos }, { data: incidentPhotos }, checkPhotos] = await Promise.all([
    admin.from("fuel_logs").select("receipt_photo_url").eq("vehicle_id", vehicleId).not("receipt_photo_url", "is", null),
    admin.from("incident_reports").select("photo_url").eq("vehicle_id", vehicleId).not("photo_url", "is", null),
    checkIds.length > 0
      ? admin.from("vehicle_check_items").select("photo_url").in("check_id", checkIds).not("photo_url", "is", null)
      : Promise.resolve({ data: [] as { photo_url: string }[] }),
  ]);
  const photosToRemove: (string | null)[] = [
    vehicle.photo_url,
    ...(fuelPhotos ?? []).map((r: { receipt_photo_url: string }) => r.receipt_photo_url),
    ...(incidentPhotos ?? []).map((r: { photo_url: string }) => r.photo_url),
    ...(checkPhotos.data ?? []).map((r: { photo_url: string }) => r.photo_url),
  ];

  type Step = { label: string; run: () => PromiseLike<{ error: { message: string } | null }> };
  const deleteSteps: Step[] = [
    ...(checkItemIds.length > 0
      ? [{ label: "incident links to checks", run: () => admin.from("incident_reports").update({ source_vehicle_check_item_id: null }).in("source_vehicle_check_item_id", checkItemIds) }]
      : []),
    ...(tripIds.length > 0
      ? [{ label: "booking links to trips", run: () => admin.from("bookings").update({ linked_trip_id: null }).in("linked_trip_id", tripIds) }]
      : []),
    { label: "incident reports", run: () => admin.from("incident_reports").delete().eq("vehicle_id", vehicleId) },
    { label: "vehicle checks", run: () => admin.from("vehicle_checks").delete().eq("vehicle_id", vehicleId) },
    { label: "fuel logs", run: () => admin.from("fuel_logs").delete().eq("vehicle_id", vehicleId) },
    { label: "bookings", run: () => admin.from("bookings").delete().eq("vehicle_id", vehicleId) },
    { label: "recurring booking series", run: () => admin.from("booking_series").delete().eq("vehicle_id", vehicleId) },
    { label: "trip history", run: () => admin.from("vehicle_usage").delete().eq("vehicle_id", vehicleId) },
  ];

  for (const step of deleteSteps) {
    const { error } = await step.run();
    if (error) {
      return {
        error: `Something went wrong deleting this vehicle's ${step.label} (nothing further was deleted): ${error.message}`,
      };
    }
  }

  const { data: deleted, error } = await admin.from("vehicles").delete().eq("id", vehicleId).select("id");
  if (error || !deleted || deleted.length === 0) {
    return {
      error: `Every record for this vehicle was deleted, but removing the vehicle itself failed${error ? `: ${error.message}` : ""}. Please try again.`,
    };
  }

  await removePhotos(admin, photosToRemove);

  revalidatePath("/admin/vehicles");
  revalidatePath("/admin");
  return { error: null };
}

export async function deleteVehicleAndRecordsFromAdmin(vehicleId: string) {
  const result = await deleteVehicleAndRecords(vehicleId);
  if (result.error) {
    redirect(`/admin/vehicles/${vehicleId}?error=${encodeURIComponent(result.error)}`);
  }
  redirect(`/admin/vehicles?success=${encodeURIComponent("Vehicle and all its records deleted.")}`);
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isComplianceCheckDayNZ, isTodayNZ } from "@/lib/nz-time";
import { getViewerFeatures } from "@/lib/orgFeatures.server";
import { tripLocationFrom } from "@/lib/geo";

import { kmCaution } from "@/lib/kmCheck";

// confirm/confirmKm: the reading looks like a typo; the form asks the
// driver to double-check and resubmits with confirmed=<km> if it's right.
type ActionState = { error: string | null; confirm?: string | null; confirmKm?: number | null };

function confirmedKm(formData: FormData, km: number): boolean {
  return Number(formData.get("confirmed")) === km;
}

export async function startTrip(
  vehicleId: string,
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You've been logged out. Please log in again." };
  }

  const kmRaw = formData.get("km");
  const km = Number(kmRaw);

  if (!kmRaw || Number.isNaN(km)) {
    return { error: "Please enter the kilometre reading shown on the vehicle." };
  }

  // Compulsory pre-operation check on Mondays and Fridays: a driver's
  // first scan of the vehicle on one of those days must be preceded by a
  // completed Pre-Operation check for that same vehicle, that same day.
  // The page itself already hides this form and points to the check
  // instead when this applies (see page.tsx) — this is the authoritative
  // server-side copy of that same rule, so it holds even if this action
  // is somehow invoked without going through that page.
  if (isComplianceCheckDayNZ()) {
    const features = await getViewerFeatures(supabase, user.id);
    if (features.vehicle_checks) {
      const { data: todaysChecks } = await supabase
        .from("vehicle_checks")
        .select("created_at")
        .eq("vehicle_id", vehicleId)
        .eq("driver_id", user.id)
        .eq("check_type", "pre")
        .order("created_at", { ascending: false })
        .limit(5);

      const hasCheckToday = (todaysChecks ?? []).some((c) => isTodayNZ(c.created_at));
      if (!hasCheckToday) {
        return {
          error: "Vehicle checks are compulsory on Mondays and Fridays — please complete a Pre-Operation Vehicle Check for this vehicle before starting.",
        };
      }
    }
  }

  if (!confirmedKm(formData, km)) {
    const { data: v } = await supabase.from("vehicles").select("current_odometer").eq("id", vehicleId).single();
    const caution = v ? kmCaution(km, Number(v.current_odometer), "start") : null;
    if (caution) return { error: null, confirm: caution, confirmKm: km };
  }

  const where = await tripLocationFrom(formData);

  const { error } = await supabase.from("vehicle_usage").insert({
    vehicle_id: vehicleId,
    driver_id: user.id,
    start_km: km,
    ...(where
      ? { start_lat: where.lat, start_lng: where.lng, start_accuracy_m: where.accuracy, start_address: where.address }
      : {}),
  });

  if (error) {
    // Postgres messages from our triggers/constraints are already
    // written to be human-readable (odometer check, booking lock).
    // Constraint violations fall back to a generic friendly message.
    if (error.message.includes("Starting KM")) return { error: error.message };
    if (error.message.includes("could not be found")) return { error: "That vehicle couldn't be found. Please scan it again." };
    if (error.message.includes("booked by another driver")) return { error: error.message };
    if (error.code === "23505") {
      return { error: "This vehicle just became unavailable, or you already have a trip active. Please refresh and try again." };
    }
    return { error: "Something went wrong starting this trip. Please try again." };
  }

  // Clears every cached screen (next.config.js staleTimes) so no tab
  // shows the old trip/check state for the next 30s.
  revalidatePath("/", "layout");
  redirect("/?success=Vehicle use started");
}

export async function finishTrip(
  tripId: string,
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You've been logged out. Please log in again." };
  }

  const kmRaw = formData.get("km");
  const km = Number(kmRaw);

  if (!kmRaw || Number.isNaN(km)) {
    return { error: "Please enter the kilometre reading shown on the vehicle." };
  }

  if (!confirmedKm(formData, km)) {
    const { data: t } = await supabase.from("vehicle_usage").select("start_km").eq("id", tripId).single();
    const caution = t ? kmCaution(km, Number(t.start_km), "finish") : null;
    if (caution) return { error: null, confirm: caution, confirmKm: km };
  }

  const where = await tripLocationFrom(formData);

  const { data: finished, error } = await supabase
    .from("vehicle_usage")
    .update({
      end_km: km,
      end_datetime: new Date().toISOString(),
      status: "completed",
      ...(where
        ? { end_lat: where.lat, end_lng: where.lng, end_accuracy_m: where.accuracy, end_address: where.address }
        : {}),
    })
    .eq("id", tripId)
    .eq("driver_id", user.id)
    .eq("status", "active")
    .select("id");

  if (!error && (!finished || finished.length === 0)) {
    return { error: "This trip has already been finished (an admin may have closed it). Refresh to see the latest." };
  }

  if (error) {
    if (error.message.includes("end_km_not_below_start")) {
      return { error: "Ending KM can't be below the starting KM." };
    }
    return { error: "Something went wrong finishing this trip. Please try again." };
  }

  // Clears every cached screen (next.config.js staleTimes) so no tab
  // shows the old trip/check state for the next 30s.
  revalidatePath("/", "layout");
  redirect("/?success=Trip finished");
}

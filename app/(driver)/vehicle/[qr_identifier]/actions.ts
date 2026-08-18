"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type ActionState = { error: string | null };

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

  const { error } = await supabase.from("vehicle_usage").insert({
    vehicle_id: vehicleId,
    driver_id: user.id,
    start_km: km,
  });

  if (error) {
    // Postgres messages from our triggers/constraints are already
    // written to be human-readable (odometer check, booking lock).
    // Constraint violations fall back to a generic friendly message.
    if (error.message.includes("Starting KM")) return { error: error.message };
    if (error.message.includes("booked by another driver")) return { error: error.message };
    if (error.code === "23505") {
      return { error: "This vehicle just became unavailable, or you already have a trip active. Please refresh and try again." };
    }
    return { error: "Something went wrong starting this trip. Please try again." };
  }

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

  const { error } = await supabase
    .from("vehicle_usage")
    .update({
      end_km: km,
      end_datetime: new Date().toISOString(),
      status: "completed",
    })
    .eq("id", tripId)
    .eq("driver_id", user.id)
    .eq("status", "active");

  if (error) {
    if (error.message.includes("end_km_not_below_start")) {
      return { error: "Ending KM can't be below the starting KM." };
    }
    return { error: "Something went wrong finishing this trip. Please try again." };
  }

  redirect("/?success=Trip finished");
}

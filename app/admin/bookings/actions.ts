"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Conflict = { date: string; vehicleName: string; requestedTime: string; existingTime: string; existingDriver: string };
type ActionState = { error: string | null; conflicts?: Conflict[] };

async function findConflicts(supabase: any, rows: any[]) {
  const conflicts: Conflict[] = [];

  for (const row of rows) {
    if (!row.vehicle_id) continue; // "To Be Assigned" — checked separately once a vehicle is picked

    const { data: overlapping } = await supabase
      .from("bookings")
      .select("*, driver:profiles(name), vehicle:vehicles(name)")
      .eq("vehicle_id", row.vehicle_id)
      .eq("approval_status", "approved")
      .in("booking_status", ["upcoming", "active"])
      .neq("id", row.id)
      .lt("start_datetime", row.end_datetime)
      .gt("end_datetime", row.start_datetime);

    for (const o of overlapping ?? []) {
      conflicts.push({
        date: new Date(row.start_datetime).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short" }),
        vehicleName: o.vehicle?.name ?? "Vehicle",
        requestedTime: `${new Date(row.start_datetime).toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit" })}–${new Date(row.end_datetime).toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit" })}`,
        existingTime: `${new Date(o.start_datetime).toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit" })}–${new Date(o.end_datetime).toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit" })}`,
        existingDriver: o.driver?.name ?? "another driver",
      });
    }
  }

  return conflicts;
}

export async function approveBooking(bookingId: string, prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: callerProfile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (callerProfile?.role !== "admin") return { error: "Only admins can approve bookings." };

  const { data: booking } = await supabase.from("bookings").select("*").eq("id", bookingId).single();
  if (!booking) return { error: "Booking not found." };

  const overrideVehicleId = (formData.get("vehicleId") as string) || null;
  const note = (formData.get("note") as string)?.trim() || null;

  let rows: any[];
  if (booking.series_id) {
    const { data } = await supabase.from("bookings").select("*").eq("series_id", booking.series_id).eq("approval_status", "pending");
    rows = data ?? [];
  } else {
    rows = [booking];
  }

  if (rows.some((r) => r.vehicle_required && !r.vehicle_id) && !overrideVehicleId) {
    return { error: "Please assign a vehicle before approving a To Be Assigned request." };
  }
  if (overrideVehicleId) {
    rows = rows.map((r) => ({ ...r, vehicle_id: overrideVehicleId }));
  }

  const conflicts = await findConflicts(supabase, rows);
  if (conflicts.length > 0) {
    return { error: null, conflicts };
  }

  const rowIds = rows.map((r) => r.id);
  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      approval_status: "approved",
      vehicle_id: overrideVehicleId ?? undefined,
      decided_by: user!.id,
      decided_at: new Date().toISOString(),
      decision_note: note,
    })
    .in("id", rowIds);

  if (updateError) {
    if (updateError.code === "23P01") {
      return { error: "Availability changed just now and this would create a double-booking. Please review and try again." };
    }
    return { error: "Something went wrong approving this booking. Please try again." };
  }

  await supabase.from("notifications").insert({
    recipient_id: booking.driver_id,
    type: "booking_approved",
    message: `${booking.title || "Booking"} approved${booking.series_id ? ` (${rows.length} occurrences)` : ""}${note ? `: ${note}` : ""}`,
    related_table: "bookings",
    related_id: booking.id,
  });

  await supabase.from("audit_log").insert({
    user_id: user!.id,
    record_type: "bookings",
    record_id: booking.series_id ?? booking.id,
    action: "booking_approved",
    old_value: { approval_status: "pending" },
    new_value: { approval_status: "approved", occurrences: rows.length },
  });

  revalidatePath("/admin/bookings");
  revalidatePath("/bookings");
  return { error: null };
}

export async function declineBooking(bookingId: string, prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: callerProfile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (callerProfile?.role !== "admin") return { error: "Only admins can decline bookings." };

  const note = (formData.get("note") as string)?.trim() || null;

  const { data: booking } = await supabase.from("bookings").select("*").eq("id", bookingId).single();
  if (!booking) return { error: "Booking not found." };

  const query = booking.series_id
    ? supabase
        .from("bookings")
        .update({ approval_status: "declined", decided_by: user!.id, decided_at: new Date().toISOString(), decision_note: note })
        .eq("series_id", booking.series_id)
        .eq("approval_status", "pending")
    : supabase
        .from("bookings")
        .update({ approval_status: "declined", decided_by: user!.id, decided_at: new Date().toISOString(), decision_note: note })
        .eq("id", bookingId);

  const { error } = await query;
  if (error) return { error: "Something went wrong declining this booking. Please try again." };

  await supabase.from("notifications").insert({
    recipient_id: booking.driver_id,
    // Declining a pending request and cancelling an approved one are the same
    // event from the driver's point of view — declining is what cancels the
    // booking, so both are notified as "declined".
    type: "booking_declined",
    message: `${booking.title || "Booking"} declined${note ? `: ${note}` : ""}`,
    related_table: "bookings",
    related_id: booking.id,
  });

  await supabase.from("audit_log").insert({
    user_id: user!.id,
    record_type: "bookings",
    record_id: booking.series_id ?? booking.id,
    action: "booking_declined",
    old_value: { approval_status: "pending" },
    new_value: { approval_status: "declined", note },
  });

  revalidatePath("/admin/bookings");
  revalidatePath("/bookings");
  return { error: null };
}

export async function adminCancelBooking(bookingId: string) {
  const supabase = createClient();

  const { data: booking } = await supabase.from("bookings").select("*").eq("id", bookingId).single();
  await supabase.from("bookings").update({ booking_status: "cancelled" }).eq("id", bookingId);

  if (booking) {
    await supabase.from("notifications").insert({
      recipient_id: booking.driver_id,
      type: "booking_declined",
      message: `${booking.title || "Booking"} declined by an admin`,
      related_table: "bookings",
      related_id: booking.id,
    });
  }

  revalidatePath("/admin/bookings");
}

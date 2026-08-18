"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { generateOccurrenceDates, type RecurrencePattern } from "@/lib/bookingRecurrence";

type ActionState = { error: string | null };

export async function createBookingRequest(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const title = (formData.get("title") as string)?.trim() || "Booking";
  const vehicleId = (formData.get("vehicleId") as string) || null;
  const vehicleRequired = formData.get("vehicleRequired") === "on";
  const date = formData.get("date") as string;
  const startTime = formData.get("startTime") as string;
  const endTime = formData.get("endTime") as string;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const approvingAdminId = formData.get("approvingAdminId") as string;
  const isRecurring = formData.get("isRecurring") === "on";

  if (!vehicleId && !vehicleRequired) {
    return { error: "Please choose a vehicle, or mark it as To Be Assigned." };
  }
  if (!date || !startTime || !endTime) {
    return { error: "Please fill in the date and start/end times." };
  }
  if (!approvingAdminId) {
    return { error: "Please select an admin to approve this request." };
  }

  const firstStart = new Date(`${date}T${startTime}`);
  const firstEnd = new Date(`${date}T${endTime}`);
  if (firstEnd <= firstStart) {
    return { error: "End time must be after the start time." };
  }
  if (firstEnd < new Date()) {
    return { error: "That time has already passed. Please choose a future date." };
  }

  let occurrenceDates = [date];
  let seriesId: string | null = null;

  if (isRecurring) {
    const mode = (formData.get("mode") as "weekly" | "monthly") || "weekly";
    const days = formData.getAll("days").map(Number);
    const intervalWeeks = Number(formData.get("intervalWeeks")) === 2 ? 2 : 1;
    const endType = formData.get("endType") as "date" | "occurrences" | "weeks";
    const endValue = formData.get("endValue") as string;

    if (mode === "weekly" && days.length === 0) return { error: "Please select at least one day for the recurring booking." };
    if (!endType || !endValue) return { error: "Please set when the recurring booking ends." };

    const pattern: RecurrencePattern = { mode, days, intervalWeeks: intervalWeeks as 1 | 2, endType, endValue };
    occurrenceDates = generateOccurrenceDates(date, pattern);

    if (occurrenceDates.length === 0) {
      return { error: "That recurrence pattern doesn't produce any bookings. Please check the settings and end condition." };
    }
    if (occurrenceDates.length > 60) {
      return { error: "That's a lot of occurrences (over 60). Please shorten the recurrence." };
    }

    const { data: series, error: seriesError } = await supabase
      .from("booking_series")
      .insert({
        driver_id: user!.id,
        vehicle_id: vehicleId,
        title,
        pattern: { mode, days, intervalWeeks, endType, endValue },
      })
      .select()
      .single();

    if (seriesError || !series) {
      return { error: "Something went wrong setting up the recurring booking. Please try again." };
    }
    seriesId = series.id;
  }

  const rows = occurrenceDates.map((occDate) => ({
    title,
    vehicle_id: vehicleId,
    vehicle_required: vehicleRequired,
    driver_id: user!.id,
    created_by: user!.id,
    start_datetime: new Date(`${occDate}T${startTime}`).toISOString(),
    end_datetime: new Date(`${occDate}T${endTime}`).toISOString(),
    notes,
    approval_status: "pending",
    booking_status: "upcoming",
    approving_admin_id: approvingAdminId,
    series_id: seriesId,
  }));

  const { error: insertError } = await supabase.from("bookings").insert(rows);

  if (insertError) {
    return { error: "Something went wrong submitting this request. Please try again." };
  }

  revalidatePath("/bookings");
  redirect("/bookings?success=Booking request submitted");
}

export async function editBooking(bookingId: string, prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: booking } = await supabase.from("bookings").select("*").eq("id", bookingId).single();
  if (!booking || booking.driver_id !== user!.id) return { error: "Booking not found." };
  if (booking.approval_status === "declined") return { error: "This request was declined — please submit a new one." };
  if (booking.booking_status !== "upcoming") return { error: "Only upcoming bookings can be edited." };

  const title = (formData.get("title") as string)?.trim() || "Booking";
  const vehicleId = (formData.get("vehicleId") as string) || null;
  const vehicleRequired = formData.get("vehicleRequired") === "on";
  const date = formData.get("date") as string;
  const startTime = formData.get("startTime") as string;
  const endTime = formData.get("endTime") as string;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!vehicleId && !vehicleRequired) return { error: "Please choose a vehicle, or mark it as To Be Assigned." };
  if (!date || !startTime || !endTime) return { error: "Please fill in the date and start/end times." };

  const newStart = new Date(`${date}T${startTime}`);
  const newEnd = new Date(`${date}T${endTime}`);
  if (newEnd <= newStart) return { error: "End time must be after the start time." };

  const materialChange =
    vehicleId !== booking.vehicle_id ||
    newStart.toISOString() !== booking.start_datetime ||
    newEnd.toISOString() !== booking.end_datetime;

  const wasApproved = booking.approval_status === "approved";

  const { error } = await supabase
    .from("bookings")
    .update({
      title,
      vehicle_id: vehicleId,
      vehicle_required: vehicleRequired,
      start_datetime: newStart.toISOString(),
      end_datetime: newEnd.toISOString(),
      notes,
      ...(wasApproved && materialChange
        ? { approval_status: "pending", decided_by: null, decided_at: null, decision_note: null }
        : {}),
    })
    .eq("id", bookingId)
    .eq("driver_id", user!.id);

  if (error) {
    if (error.code === "23P01") {
      return { error: "This vehicle is already booked over part of that time." };
    }
    return { error: "Something went wrong saving your changes. Please try again." };
  }

  revalidatePath("/bookings");
  redirect(
    `/bookings?success=${wasApproved && materialChange ? "Booking updated — sent back for re-approval" : "Booking updated"}`
  );
}

export async function cancelBooking(bookingId: string, scope: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: booking } = await supabase.from("bookings").select("*").eq("id", bookingId).single();
  if (!booking || booking.driver_id !== user!.id) return;

  if (scope === "this" || !booking.series_id) {
    await supabase.from("bookings").update({ booking_status: "cancelled" }).eq("id", bookingId).eq("driver_id", user!.id);
  } else if (scope === "future") {
    await supabase
      .from("bookings")
      .update({ booking_status: "cancelled" })
      .eq("series_id", booking.series_id)
      .eq("driver_id", user!.id)
      .gte("start_datetime", booking.start_datetime);
  } else if (scope === "series") {
    await supabase
      .from("bookings")
      .update({ booking_status: "cancelled" })
      .eq("series_id", booking.series_id)
      .eq("driver_id", user!.id);
  }

  revalidatePath("/bookings");
}

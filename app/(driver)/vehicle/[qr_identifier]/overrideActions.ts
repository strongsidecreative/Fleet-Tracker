"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { notifyDriver } from "@/lib/bookingNotify";

export async function overrideBooking(bookingId: string, reason: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase.from("profiles").select("role, name").eq("id", user.id).single();
  if (profile?.role !== "admin") return;

  const { data: booking } = await supabase.from("bookings").select("*, vehicle:vehicles(name)").eq("id", bookingId).single();
  if (!booking) return;

  const { data: cancelled } = await supabase
    .from("bookings")
    .update({ booking_status: "cancelled" })
    .eq("id", bookingId)
    .select("id");
  if (!cancelled || cancelled.length === 0) return;

  await supabase.from("audit_log").insert({
    user_id: user.id,
    record_type: "bookings",
    record_id: bookingId,
    action: "booking_override",
    old_value: { booking_status: booking.booking_status },
    new_value: { booking_status: "cancelled", reason },
  });

  await notifyDriver(
    supabase,
    bookingId,
    "booking_override",
    `${profile?.name} overrode your booking on ${booking.vehicle?.name}${reason ? `: ${reason}` : ""}`
  );

  revalidatePath("/", "layout");
}

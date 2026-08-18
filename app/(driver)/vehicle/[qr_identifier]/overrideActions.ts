"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function overrideBooking(bookingId: string, reason: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("role, name").eq("id", user!.id).single();
  if (profile?.role !== "admin") return;

  const { data: booking } = await supabase.from("bookings").select("*, vehicle:vehicles(name)").eq("id", bookingId).single();
  if (!booking) return;

  await supabase.from("bookings").update({ booking_status: "cancelled" }).eq("id", bookingId);

  await supabase.from("audit_log").insert({
    user_id: user!.id,
    record_type: "bookings",
    record_id: bookingId,
    action: "booking_override",
    old_value: { booking_status: booking.booking_status },
    new_value: { booking_status: "cancelled", reason },
  });

  await supabase.from("notifications").insert({
    recipient_id: booking.driver_id,
    type: "booking_override",
    message: `${profile?.name} overrode your booking on ${booking.vehicle?.name}${reason ? `: ${reason}` : ""}`,
    related_table: "bookings",
    related_id: bookingId,
  });

  revalidatePath(`/vehicle`);
}

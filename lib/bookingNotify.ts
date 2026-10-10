import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Tells the booking's driver about a decision (and pushes it to their
 * phone via the notifications trigger). Goes through the
 * notify_booking_driver() database function (migration 0021), which
 * checks the caller is an admin in the booking's organisation; a direct
 * insert into notifications is blocked by RLS and silently did nothing.
 * Never fails the decision itself if the notification can't be sent.
 */
export async function notifyDriver(
  supabase: SupabaseClient,
  bookingId: string,
  type: "booking_approved" | "booking_declined" | "booking_override",
  message: string
) {
  const { error } = await supabase.rpc("notify_booking_driver", {
    p_booking_id: bookingId,
    p_type: type,
    p_message: message,
  });
  if (error) console.error("notify_booking_driver failed", error.message);
}


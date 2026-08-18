import { createClient } from "@/lib/supabase/server";
import EditBookingForm from "./EditBookingForm";

export default async function EditBookingPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: booking } = await supabase.from("bookings").select("*").eq("id", params.id).single();
  const { data: vehicles } = await supabase.from("vehicles").select("id, name, registration").eq("active", true).order("name");

  if (!booking || booking.driver_id !== user!.id) {
    return <p className="text-sm text-steel">Booking not found.</p>;
  }
  if (booking.booking_status !== "upcoming") {
    return <p className="text-sm text-steel">This booking can no longer be edited.</p>;
  }

  return (
    <div>
      <h1 className="mb-4 font-display text-xl font-bold text-ink">Edit Booking</h1>
      <EditBookingForm booking={booking} vehicles={vehicles ?? []} />
    </div>
  );
}

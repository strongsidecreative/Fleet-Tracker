import { createClient } from "@/lib/supabase/server";
import ApprovalActions from "./ApprovalActions";

export default async function BookingApprovalPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  // Neither of these depends on the other's result — fetch together.
  const [{ data: booking }, { data: vehicles }] = await Promise.all([
    supabase
      .from("bookings")
      .select("*, vehicle:vehicles(name, registration), driver:profiles(name)")
      .eq("id", params.id)
      .single(),
    supabase.from("vehicles").select("id, name").eq("active", true).order("name"),
  ]);

  if (!booking) {
    return <p className="text-sm text-steel">Booking not found.</p>;
  }

  let occurrences: any[] = [booking];
  if (booking.series_id) {
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("series_id", booking.series_id)
      .order("start_datetime", { ascending: true });
    occurrences = data ?? [booking];
  }

  const isDecided = booking.approval_status !== "pending";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">{booking.title || "Booking"}</h1>
        <p className="text-xs text-steel">Submitted {new Date(booking.created_at).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
      </div>

      <div className="rounded-xl border border-steel/20 bg-white p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-steel">Driver</p>
            <p className="text-ink">{booking.driver?.name}</p>
          </div>
          <div>
            <p className="text-xs text-steel">Vehicle</p>
            <p className="text-ink">{booking.vehicle?.name ?? "To Be Assigned"}</p>
          </div>
          <div>
            <p className="text-xs text-steel">Occurrences</p>
            <p className="text-ink">{occurrences.length}</p>
          </div>
          <div>
            <p className="text-xs text-steel">Status</p>
            <p className="capitalize text-ink">{booking.approval_status}</p>
          </div>
        </div>
        {booking.notes && (
          <div className="mt-3">
            <p className="text-xs text-steel">Driver notes</p>
            <p className="text-sm text-ink">{booking.notes}</p>
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-ink">{occurrences.length > 1 ? "All Occurrences" : "Date & Time"}</p>
        <div className="max-h-60 space-y-1 overflow-y-auto rounded-xl border border-steel/20 bg-white p-2">
          {occurrences.map((o) => (
            <p key={o.id} className="px-2 py-1 text-sm text-ink">
              {new Date(o.start_datetime).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "short", day: "numeric", month: "short" })}
              {" · "}
              {new Date(o.start_datetime).toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit" })}
              {"–"}
              {new Date(o.end_datetime).toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit" })}
            </p>
          ))}
        </div>
      </div>

      {isDecided ? (
        <div className="rounded-xl border border-steel/20 bg-white p-4 text-sm">
          <p className="font-medium capitalize text-ink">{booking.approval_status}</p>
          {booking.decision_note && <p className="mt-1 text-steel">Note: {booking.decision_note}</p>}
        </div>
      ) : (
        <ApprovalActions bookingId={booking.id} needsVehicle={booking.vehicle_required && !booking.vehicle_id} vehicles={vehicles ?? []} />
      )}
    </div>
  );
}

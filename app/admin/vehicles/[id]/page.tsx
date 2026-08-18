import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import EditVehicleForm from "./EditVehicleForm";

export default async function VehicleDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: vehicle } = await supabase.from("vehicles").select("*").eq("id", params.id).single();

  if (!vehicle) {
    return <p className="text-sm text-steel">Vehicle not found.</p>;
  }

  const nowIso = new Date().toISOString();
  const { data: upcomingBookings } = await supabase
    .from("bookings")
    .select("*, driver:profiles(name)")
    .eq("vehicle_id", vehicle.id)
    .eq("approval_status", "approved")
    .in("booking_status", ["upcoming", "active"])
    .gte("end_datetime", nowIso)
    .order("start_datetime", { ascending: true })
    .limit(10);

  const { data: pendingRequests } = await supabase
    .from("bookings")
    .select("*, driver:profiles(name)")
    .eq("vehicle_id", vehicle.id)
    .eq("approval_status", "pending")
    .order("start_datetime", { ascending: true })
    .limit(10);

  return (
    <div>
      <h1 className="font-display text-xl font-bold text-ink">{vehicle.name}</h1>
      <p className="mb-4 text-xs text-steel">
        {vehicle.registration} · Odometer {vehicle.current_odometer.toLocaleString("en-NZ")} KM
      </p>
      <div className="mb-4 flex gap-2">
        <a
          href={`/admin/vehicles/${vehicle.id}/qr`}
          className="inline-block rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-paper"
        >
          View / Print QR Code
        </a>
        <a
          href={`/admin/vehicle-checks?vehicleId=${vehicle.id}`}
          className="inline-block rounded-lg border border-steel/30 px-3 py-2 text-xs font-semibold text-ink"
        >
          Vehicle Check History
        </a>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-sm font-bold text-ink">Upcoming Bookings</p>
        <div className="space-y-2">
          {(!upcomingBookings || upcomingBookings.length === 0) && <p className="text-sm text-steel">None.</p>}
          {upcomingBookings?.map((b) => (
            <div key={b.id} className="rounded-lg border border-steel/20 bg-white p-2 text-sm">
              <span className="font-medium text-ink">{b.driver?.name}</span> — {b.title || "Booking"} ·{" "}
              {new Date(b.start_datetime).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
            </div>
          ))}
        </div>
      </div>

      {pendingRequests && pendingRequests.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-sm font-bold text-ink">Pending Requests</p>
          <div className="space-y-2">
            {pendingRequests.map((b) => (
              <Link key={b.id} href={`/admin/bookings/${b.id}`} className="block rounded-lg border border-amber/40 bg-amber/5 p-2 text-sm">
                <span className="font-medium text-ink">{b.driver?.name}</span> — {b.title || "Booking"} ·{" "}
                {new Date(b.start_datetime).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
              </Link>
            ))}
          </div>
        </div>
      )}

      <EditVehicleForm vehicle={vehicle} />
    </div>
  );
}

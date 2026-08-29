import { createClient } from "@/lib/supabase/server";

export default async function VehiclesPage() {
  const supabase = createClient();

  const nowIso = new Date().toISOString();
  // None of these three depend on each other — fetch together.
  const [{ data: vehicles }, { data: activeTrips }, { data: bookings }] = await Promise.all([
    supabase.from("vehicles").select("*").eq("active", true).order("name"),
    supabase.from("vehicle_usage").select("*, driver:profiles(name)").eq("status", "active"),
    supabase
      .from("bookings")
      .select("*, driver:profiles(name)")
      .eq("status", "upcoming")
      .gte("end_datetime", nowIso)
      .order("start_datetime"),
  ]);

  const activeTripFor = (vehicleId: string) => activeTrips?.find((t) => t.vehicle_id === vehicleId);
  const nextBookingFor = (vehicleId: string) => bookings?.find((b) => b.vehicle_id === vehicleId);

  return (
    <div>
      <h1 className="mb-4 font-display text-xl font-bold text-ink">Vehicles</h1>
      <div className="space-y-2">
        {vehicles?.map((v) => {
          const active = activeTripFor(v.id);
          const booking = nextBookingFor(v.id);
          const bookingNow = booking && new Date(booking.start_datetime) <= new Date();

          return (
            <div key={v.id} className="rounded-xl border border-steel/20 bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                {v.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v.photo_url}
                    alt={v.name}
                    loading="lazy"
                    decoding="async"
                    className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-paper" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-ink">{v.name}</p>
                  <p className="text-xs text-steel">
                    {active
                      ? `${active.driver?.name} · since ${new Date(active.start_datetime).toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit" })}`
                      : `Last KM: ${v.current_odometer.toLocaleString("en-NZ")}`}
                  </p>
                  {booking && (
                    <p className="mt-0.5 text-xs text-steel">
                      {bookingNow ? "Reserved by " : "Booked by "}
                      {booking.driver?.name}
                      {" · "}
                      {new Date(booking.start_datetime).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland",
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {" – "}
                      {new Date(booking.end_datetime).toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit" })}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                    active ? "bg-amber/15 text-amber" : "bg-track/15 text-track"
                  }`}
                >
                  {active ? "In Use" : "Available"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

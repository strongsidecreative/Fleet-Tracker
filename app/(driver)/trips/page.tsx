import { createClient } from "@/lib/supabase/server";

export default async function MyTripsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: trips } = await supabase
    .from("vehicle_usage")
    .select("*, vehicle:vehicles(name)")
    .eq("driver_id", user!.id)
    .eq("status", "completed")
    .order("start_datetime", { ascending: false });

  return (
    <div>
      <h1 className="mb-4 font-display text-xl font-bold text-ink">My Trips</h1>
      <div className="space-y-2">
        {(!trips || trips.length === 0) && <p className="text-sm text-steel">No completed trips yet.</p>}
        {trips?.map((t) => (
          <div key={t.id} className="rounded-xl border border-steel/20 bg-white p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-ink">{t.vehicle?.name}</span>
              <span className="text-xs text-steel">
                {new Date(t.start_datetime).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short" })}
              </span>
            </div>
            <div className="mt-1 flex justify-between text-xs text-steel">
              <span>
                {t.start_km.toLocaleString("en-NZ")} → {t.end_km?.toLocaleString("en-NZ")} KM ·{" "}
                {new Date(t.start_datetime).toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit" })}–
                {t.end_datetime &&
                  new Date(t.end_datetime).toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit" })}
              </span>
              <span className="odometer font-bold text-ink">{t.kilometres_used?.toLocaleString("en-NZ")} KM</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import CloseSessionForm from "./CloseSessionForm";

function hoursOpen(start: string) {
  const ms = Date.now() - new Date(start).getTime();
  const hours = ms / (1000 * 60 * 60);
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  return `${hours.toFixed(1)} hrs`;
}

export default async function AdminSessionsPage() {
  const supabase = createClient();
  const { data: activeTrips } = await supabase
    .from("vehicle_usage")
    .select("*, vehicle:vehicles(name), driver:profiles(name)")
    .eq("status", "active")
    .order("start_datetime", { ascending: true });

  return (
    <div>
      <h1 className="mb-1 font-display text-xl font-bold text-ink">Open Vehicle Sessions</h1>
      <p className="mb-4 text-sm text-steel">
        Trips still marked active. If someone forgot to finish, close it out here with the correct ending KM.
      </p>
      <div className="space-y-2">
        {(!activeTrips || activeTrips.length === 0) && <p className="text-sm text-steel">No open sessions.</p>}
        {activeTrips?.map((t) => (
          <div key={t.id} className="rounded-xl border border-steel/20 bg-white p-3">
            <div className="flex items-center justify-between">
              <p className="font-medium text-ink">{t.vehicle?.name}</p>
              <span className="text-xs font-medium text-amber">Open {hoursOpen(t.start_datetime)}</span>
            </div>
            <p className="mt-1 text-xs text-steel">
              {t.driver?.name} · Started{" "}
              {new Date(t.start_datetime).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}{" "}
              · Start KM: {t.start_km.toLocaleString("en-NZ")}
            </p>
            <CloseSessionForm tripId={t.id} />
          </div>
        ))}
      </div>
    </div>
  );
}

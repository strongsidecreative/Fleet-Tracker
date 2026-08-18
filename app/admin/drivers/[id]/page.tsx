import { createClient } from "@/lib/supabase/server";
import LicenceSection from "./LicenceSection";
import { startOfWeekNZ, startOfMonthNZ } from "@/lib/nz-time";

export default async function DriverDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: driver } = await supabase.from("profiles").select("*").eq("id", params.id).single();
  const { data: licence } = await supabase.from("driver_licences").select("*").eq("driver_id", params.id).maybeSingle();
  const { data: trips } = await supabase
    .from("vehicle_usage")
    .select("*, vehicle:vehicles(name)")
    .eq("driver_id", params.id)
    .eq("status", "completed")
    .order("start_datetime", { ascending: false });

  if (!driver) {
    return <p className="text-sm text-steel">Driver not found.</p>;
  }

  const now = new Date();
  const weekStart = startOfWeekNZ(now);
  const monthStart = startOfMonthNZ(now);
  const allTrips = trips ?? [];
  const weekKm = allTrips.filter((t) => new Date(t.start_datetime) >= weekStart).reduce((s, t) => s + (t.kilometres_used ?? 0), 0);
  const monthKm = allTrips.filter((t) => new Date(t.start_datetime) >= monthStart).reduce((s, t) => s + (t.kilometres_used ?? 0), 0);
  const totalKm = allTrips.reduce((s, t) => s + (t.kilometres_used ?? 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">
          {driver.name} {!driver.active && <span className="text-sm text-steel">(inactive)</span>}
        </h1>
        <p className="text-xs text-steel">{driver.email}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-steel/20 bg-white p-3 text-center">
          <p className="text-xs text-steel">Week</p>
          <p className="odometer font-bold text-ink">{weekKm.toLocaleString("en-NZ")} KM</p>
        </div>
        <div className="rounded-xl border border-steel/20 bg-white p-3 text-center">
          <p className="text-xs text-steel">Month</p>
          <p className="odometer font-bold text-ink">{monthKm.toLocaleString("en-NZ")} KM</p>
        </div>
        <div className="rounded-xl border border-steel/20 bg-white p-3 text-center">
          <p className="text-xs text-steel">Total</p>
          <p className="odometer font-bold text-ink">{totalKm.toLocaleString("en-NZ")} KM</p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-ink">Driver Licence</p>
        <LicenceSection driverId={driver.id} licence={licence} />
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-ink">Recent Trips</p>
        <div className="space-y-2">
          {allTrips.slice(0, 5).map((t) => (
            <div key={t.id} className="rounded-xl border border-steel/20 bg-white p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink">{t.vehicle?.name}</span>
                <span className="text-xs text-steel">
                  {new Date(t.start_datetime).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short" })}
                </span>
              </div>
              <span className="odometer text-xs font-bold text-ink">{t.kilometres_used?.toLocaleString("en-NZ")} KM</span>
            </div>
          ))}
          {allTrips.length === 0 && <p className="text-sm text-steel">No trips yet.</p>}
        </div>
      </div>
    </div>
  );
}

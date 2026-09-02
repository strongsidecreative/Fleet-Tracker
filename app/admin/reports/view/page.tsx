import { createClient } from "@/lib/supabase/server";
import { getViewerFeatures } from "@/lib/orgFeatures.server";

export default async function ReportViewPage({
  searchParams,
}: {
  searchParams: { start?: string; end?: string; label?: string };
}) {
  const supabase = createClient();
  const start = searchParams.start;
  const end = searchParams.end;

  if (!start || !end) {
    return <p className="text-sm text-steel">Missing report period.</p>;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const features = await getViewerFeatures(supabase, user!.id);

  const [{ data: trips }, { data: fuelLogs }] = await Promise.all([
    supabase
      .from("vehicle_usage")
      .select("*, vehicle:vehicles(name), driver:profiles(name)")
      .eq("status", "completed")
      .gte("start_datetime", `${start}T00:00:00`)
      .lte("start_datetime", `${end}T23:59:59`),
    features.fuel_tracking
      ? supabase
          .from("fuel_logs")
          .select("*, vehicle:vehicles(name)")
          .gte("created_at", `${start}T00:00:00`)
          .lte("created_at", `${end}T23:59:59`)
      : Promise.resolve({ data: null as { vehicle_id: string; vehicle: { name: string } | null; litres: number; cost: number }[] | null }),
  ]);

  const rows = trips ?? [];
  const totalKm = rows.reduce((s, t) => s + (t.kilometres_used ?? 0), 0);
  const totalTrips = rows.length;
  const vehiclesUsed = new Set(rows.map((t) => t.vehicle_id)).size;
  const driversActive = new Set(rows.map((t) => t.driver_id)).size;

  const byDriver: Record<string, { name: string; trips: number; km: number }> = {};
  rows.forEach((t) => {
    const key = t.driver_id;
    if (!byDriver[key]) byDriver[key] = { name: t.driver?.name ?? "Unknown", trips: 0, km: 0 };
    byDriver[key].trips += 1;
    byDriver[key].km += t.kilometres_used ?? 0;
  });

  const byVehicle: Record<string, { name: string; trips: number; km: number }> = {};
  rows.forEach((t) => {
    const key = t.vehicle_id;
    if (!byVehicle[key]) byVehicle[key] = { name: t.vehicle?.name ?? "Unknown", trips: 0, km: 0 };
    byVehicle[key].trips += 1;
    byVehicle[key].km += t.kilometres_used ?? 0;
  });

  const driverRows = Object.values(byDriver).sort((a, b) => b.km - a.km);
  const vehicleRows = Object.values(byVehicle).sort((a, b) => b.km - a.km);

  // Fuel-to-KM: litres/cost purchased in this period against KM driven in
  // this same period, per vehicle. This is "fuel bought" not "fuel burned"
  // — a fill-up near either edge of the date range can skew a single
  // period, but it evens out over a few weeks/months, which is the level
  // this is meant to be read at.
  const fuelByVehicle: Record<string, { name: string; litres: number; cost: number }> = {};
  (fuelLogs ?? []).forEach((f) => {
    const key = f.vehicle_id;
    if (!fuelByVehicle[key]) fuelByVehicle[key] = { name: f.vehicle?.name ?? "Unknown", litres: 0, cost: 0 };
    fuelByVehicle[key].litres += f.litres;
    fuelByVehicle[key].cost += f.cost;
  });

  const fuelTotalLitres = (fuelLogs ?? []).reduce((s, f) => s + f.litres, 0);
  const fuelTotalCost = (fuelLogs ?? []).reduce((s, f) => s + f.cost, 0);

  const fuelVehicleRows = Object.entries(fuelByVehicle)
    .map(([vehicleId, f]) => {
      const km = byVehicle[vehicleId]?.km ?? 0;
      return {
        name: f.name,
        litres: f.litres,
        cost: f.cost,
        km,
        litresPer100km: km > 0 ? (f.litres / km) * 100 : null,
        costPerKm: km > 0 ? f.cost / km : null,
      };
    })
    .sort((a, b) => b.cost - a.cost);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-ink">{searchParams.label ?? `${start} to ${end}`}</h1>
        <a
          href={`/admin/reports/export?start=${start}&end=${end}`}
          className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-paper"
        >
          Export CSV
        </a>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-steel/20 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-steel">Total KM</p>
          <p className="odometer mt-1 text-2xl font-bold text-ink">{totalKm.toLocaleString("en-NZ")} KM</p>
        </div>
        <div className="rounded-xl border border-steel/20 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-steel">Total Trips</p>
          <p className="odometer mt-1 text-2xl font-bold text-ink">{totalTrips}</p>
        </div>
        <div className="rounded-xl border border-steel/20 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-steel">Vehicles Used</p>
          <p className="odometer mt-1 text-2xl font-bold text-ink">{vehiclesUsed}</p>
        </div>
        <div className="rounded-xl border border-steel/20 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-steel">Active Drivers</p>
          <p className="odometer mt-1 text-2xl font-bold text-ink">{driversActive}</p>
        </div>
      </div>

      <p className="mb-2 text-sm font-bold text-ink">KM by Driver</p>
      <div className="mb-5 overflow-hidden rounded-xl border border-steel/20 bg-white">
        {driverRows.length === 0 && <p className="p-3 text-sm text-steel">No trips in this period.</p>}
        {driverRows.map((d, i) => (
          <div key={d.name} className={`flex items-center justify-between px-3 py-2.5 text-sm ${i > 0 ? "border-t border-steel/10" : ""}`}>
            <span className="text-ink">{d.name}</span>
            <span className="text-steel">{d.trips} trips</span>
            <span className="odometer font-bold text-ink">{d.km.toLocaleString("en-NZ")} KM</span>
          </div>
        ))}
      </div>

      <p className="mb-2 text-sm font-bold text-ink">KM by Vehicle</p>
      <div className="mb-5 overflow-hidden rounded-xl border border-steel/20 bg-white">
        {vehicleRows.length === 0 && <p className="p-3 text-sm text-steel">No trips in this period.</p>}
        {vehicleRows.map((v, i) => (
          <div key={v.name} className={`flex items-center justify-between px-3 py-2.5 text-sm ${i > 0 ? "border-t border-steel/10" : ""}`}>
            <span className="text-ink">{v.name}</span>
            <span className="text-steel">{v.trips} trips</span>
            <span className="odometer font-bold text-ink">{v.km.toLocaleString("en-NZ")} KM</span>
          </div>
        ))}
      </div>

      {features.fuel_tracking && (
        <>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-ink">Fuel</p>
            <a
              href={`/admin/fuel/export?start=${start}&end=${end}`}
              className="text-xs font-medium text-brand underline"
            >
              Export Fuel CSV
            </a>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-steel/20 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-steel">Litres Purchased</p>
              <p className="odometer mt-1 text-2xl font-bold text-ink">{fuelTotalLitres.toFixed(1)} L</p>
            </div>
            <div className="rounded-xl border border-steel/20 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-steel">Fuel Spend</p>
              <p className="odometer mt-1 text-2xl font-bold text-ink">
                {fuelTotalCost.toLocaleString("en-NZ", { style: "currency", currency: "NZD" })}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-steel/20 bg-white">
            {fuelVehicleRows.length === 0 && <p className="p-3 text-sm text-steel">No fuel logged in this period.</p>}
            {fuelVehicleRows.map((f, i) => (
              <div key={f.name} className={`px-3 py-2.5 text-sm ${i > 0 ? "border-t border-steel/10" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className="text-ink">{f.name}</span>
                  <span className="odometer font-bold text-ink">
                    {f.cost.toLocaleString("en-NZ", { style: "currency", currency: "NZD" })}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between text-xs text-steel">
                  <span>
                    {f.litres.toFixed(1)} L{f.km > 0 ? ` · ${f.km.toLocaleString("en-NZ")} KM driven` : ""}
                  </span>
                  <span>
                    {f.litresPer100km !== null
                      ? `${f.litresPer100km.toFixed(1)} L/100km · ${(f.costPerKm ?? 0).toLocaleString("en-NZ", { style: "currency", currency: "NZD" })}/KM`
                      : "No completed trips this period"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-2 text-xs text-steel">
            Based on fuel purchased in this period against KM driven in this period — a fill-up right at the edge
            of the date range can skew a single week, but it settles out over a month.
          </p>
        </>
      )}
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";

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

  const { data: trips } = await supabase
    .from("vehicle_usage")
    .select("*, vehicle:vehicles(name), driver:profiles(name)")
    .eq("status", "completed")
    .gte("start_datetime", `${start}T00:00:00`)
    .lte("start_datetime", `${end}T23:59:59`);

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
      <div className="overflow-hidden rounded-xl border border-steel/20 bg-white">
        {vehicleRows.length === 0 && <p className="p-3 text-sm text-steel">No trips in this period.</p>}
        {vehicleRows.map((v, i) => (
          <div key={v.name} className={`flex items-center justify-between px-3 py-2.5 text-sm ${i > 0 ? "border-t border-steel/10" : ""}`}>
            <span className="text-ink">{v.name}</span>
            <span className="text-steel">{v.trips} trips</span>
            <span className="odometer font-bold text-ink">{v.km.toLocaleString("en-NZ")} KM</span>
          </div>
        ))}
      </div>
    </div>
  );
}

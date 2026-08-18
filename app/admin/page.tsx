import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { overallSeverity, wofStatus, regoStatus, rucStatus, serviceStatus, SEVERITY_BADGE_CLASS, SEVERITY_LABEL } from "@/lib/vehicleAlerts";
import { startOfWeekNZ, startOfMonthNZ } from "@/lib/nz-time";
import WeeklyKmChart from "@/components/WeeklyKmChart";

export default async function AdminDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", user!.id)
    .eq("read", false);

  const { data: vehicles } = await supabase.from("vehicles").select("*").eq("active", true);
  const { data: activeTrips } = await supabase.from("vehicle_usage").select("vehicle_id").eq("status", "active");
  const { data: completedTrips } = await supabase
    .from("vehicle_usage")
    .select("*, vehicle:vehicles(name)")
    .eq("status", "completed");
  const { data: drivers } = await supabase.from("profiles").select("id, name").eq("role", "driver");

  const inUseCount = activeTrips?.length ?? 0;
  const now = new Date();
  const weekStart = startOfWeekNZ(now);
  const monthStart = startOfMonthNZ(now);
  const trips = completedTrips ?? [];
  const weekTrips = trips.filter((t) => new Date(t.start_datetime) >= weekStart);
  const monthTrips = trips.filter((t) => new Date(t.start_datetime) >= monthStart);

  const weeklyChartData = Array.from({ length: 8 }, (_, i) => {
    const idx = 7 - i;
    const wStart = new Date(weekStart);
    wStart.setUTCDate(wStart.getUTCDate() - idx * 7);
    const wEnd = new Date(wStart);
    wEnd.setUTCDate(wStart.getUTCDate() + 7);
    const km = trips
      .filter((t) => {
        const d = new Date(t.start_datetime);
        return d >= wStart && d < wEnd;
      })
      .reduce((s, t) => s + (t.kilometres_used ?? 0), 0);
    return {
      week: wStart.toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short" }),
      km,
    };
  });

  const byVehicleKm: Record<string, { name: string; km: number }> = {};
  trips.forEach((t) => {
    const key = t.vehicle_id;
    if (!byVehicleKm[key]) byVehicleKm[key] = { name: t.vehicle?.name ?? "Unknown", km: 0 };
    byVehicleKm[key].km += t.kilometres_used ?? 0;
  });
  const topVehicle = Object.values(byVehicleKm).sort((a, b) => b.km - a.km)[0];

  const byDriverKm: Record<string, number> = {};
  trips.forEach((t) => {
    byDriverKm[t.driver_id] = (byDriverKm[t.driver_id] ?? 0) + (t.kilometres_used ?? 0);
  });
  const topDriverEntry = Object.entries(byDriverKm).sort((a, b) => b[1] - a[1])[0];
  const topDriver = topDriverEntry ? drivers?.find((d) => d.id === topDriverEntry[0]) : null;

  return (
    <div className="space-y-5">
      <h1 className="font-display text-xl font-bold text-ink">Admin Dashboard</h1>

      {!!unreadCount && unreadCount > 0 && (
        <Link
          href="/admin/notifications"
          className="flex items-center justify-between rounded-xl border border-rust/40 bg-rust/10 p-3"
        >
          <span className="text-sm font-semibold text-rust">
            {unreadCount} unread notification{unreadCount > 1 ? "s" : ""}
          </span>
          <span className="text-xs text-rust underline">View</span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-steel/20 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-steel">Vehicles In Use</p>
          <p className="odometer mt-1 text-2xl font-bold text-ink">
            {inUseCount} / {vehicles?.length ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-steel/20 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-steel">Vehicles Available</p>
          <p className="odometer mt-1 text-2xl font-bold text-ink">
            {(vehicles?.length ?? 0) - inUseCount} / {vehicles?.length ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-steel/20 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-steel">KM This Week</p>
          <p className="odometer mt-1 text-2xl font-bold text-ink">
            {weekTrips.reduce((s, t) => s + (t.kilometres_used ?? 0), 0).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland" })} KM
          </p>
        </div>
        <div className="rounded-xl border border-steel/20 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-steel">KM This Month</p>
          <p className="odometer mt-1 text-2xl font-bold text-ink">
            {monthTrips.reduce((s, t) => s + (t.kilometres_used ?? 0), 0).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland" })} KM
          </p>
        </div>
        <div className="rounded-xl border border-steel/20 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-steel">Trips This Week</p>
          <p className="odometer mt-1 text-2xl font-bold text-ink">{weekTrips.length}</p>
        </div>
        {topVehicle && (
          <div className="rounded-xl border border-steel/20 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-steel">Most Used Vehicle</p>
            <p className="odometer mt-1 text-lg font-bold text-ink">{topVehicle.name}</p>
            <p className="text-xs text-steel">{topVehicle.km.toLocaleString("en-NZ")} KM</p>
          </div>
        )}
        {topDriver && (
          <div className="rounded-xl border border-steel/20 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-steel">Highest Driver Usage</p>
            <p className="odometer mt-1 text-lg font-bold text-ink">{topDriver.name}</p>
            <p className="text-xs text-steel">{topDriverEntry![1].toLocaleString("en-NZ")} KM</p>
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-ink">KM by Week</p>
        <WeeklyKmChart data={weeklyChartData} />
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-ink">Vehicle Alerts</p>
        <div className="overflow-hidden rounded-xl border border-steel/20 bg-white">
          {(!vehicles || vehicles.length === 0) && <p className="p-3 text-sm text-steel">No vehicles yet.</p>}
          {vehicles
            ?.map((v) => ({ v, severity: overallSeverity(v) }))
            .sort((a, b) => {
              const rank = { action_required: 4, urgent: 3, due_soon: 2, upcoming: 1, ok: 0 } as const;
              return rank[b.severity] - rank[a.severity];
            })
            .map(({ v, severity }, i) => (
              <Link
                key={v.id}
                href={`/admin/vehicles/${v.id}`}
                className={`block px-3 py-2.5 text-sm ${i > 0 ? "border-t border-steel/10" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink">{v.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${SEVERITY_BADGE_CLASS[severity]}`}>
                    {SEVERITY_LABEL[severity]}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-steel">
                  <span>{wofStatus(v).label}</span>
                  <span>{regoStatus(v).label}</span>
                  <span>{rucStatus(v).label}</span>
                  <span>{serviceStatus(v).label}</span>
                  <span>Odometer: {v.current_odometer.toLocaleString("en-NZ")} KM</span>
                </div>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}

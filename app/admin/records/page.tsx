import { createClient } from "@/lib/supabase/server";
import SuccessBanner from "@/components/SuccessBanner";
import CloseSessionForm from "./CloseSessionForm";

function hoursOpen(start: string) {
  const ms = Date.now() - new Date(start).getTime();
  const hours = ms / (1000 * 60 * 60);
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  return `${hours.toFixed(1)} hrs`;
}

export default async function AdminRecordsPage({
  searchParams,
}: {
  searchParams: { driverId?: string; vehicleId?: string; start?: string; end?: string; status?: string };
}) {
  const supabase = createClient();
  const { driverId, vehicleId, start, end, status } = searchParams;

  let query = supabase
    .from("vehicle_usage")
    .select("*, vehicle:vehicles(name), driver:profiles(name)")
    .order("start_datetime", { ascending: false })
    .limit(300);

  if (driverId) query = query.eq("driver_id", driverId);
  if (vehicleId) query = query.eq("vehicle_id", vehicleId);
  if (status) query = query.eq("status", status);
  if (start) query = query.gte("start_datetime", `${start}T00:00:00`);
  if (end) query = query.lte("start_datetime", `${end}T23:59:59`);

  // None of these four depend on each other — the filter dropdowns, the
  // always-shown open-sessions list, and the filtered table all fetch
  // together instead of one after another.
  const [{ data: drivers }, { data: vehicles }, { data: openSessions }, { data: trips }] = await Promise.all([
    supabase.from("profiles").select("id, name").eq("role", "driver").order("name"),
    supabase.from("vehicles").select("id, name").order("name"),
    // Trips still marked active belong at the top of this page, not on a
    // separate "Sessions" tab — it's the same vehicle_usage table, and an
    // admin looking at usage records is exactly who needs to notice one
    // was left open. Always shown regardless of the filters below, so a
    // stuck session never gets hidden by an unrelated date range.
    supabase
      .from("vehicle_usage")
      .select("*, vehicle:vehicles(name), driver:profiles(name)")
      .eq("status", "active")
      .order("start_datetime", { ascending: true }),
    query,
  ]);

  const exportParams = new URLSearchParams();
  if (driverId) exportParams.set("driverId", driverId);
  if (vehicleId) exportParams.set("vehicleId", vehicleId);
  if (status) exportParams.set("status", status);
  if (start) exportParams.set("start", start);
  if (end) exportParams.set("end", end);

  return (
    <div>
      <SuccessBanner />

      {openSessions && openSessions.length > 0 && (
        <div className="mb-5">
          <h2 className="mb-2 font-display text-base font-bold text-ink">
            Open Sessions <span className="text-sm font-normal text-steel">— still marked active</span>
          </h2>
          <div className="space-y-2">
            {openSessions.map((t) => (
              <div key={t.id} className="rounded-xl border border-amber/40 bg-amber/10 p-3">
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
      )}

      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-ink">Usage Records</h1>
        <a
          href={`/admin/records/export${exportParams.toString() ? `?${exportParams}` : ""}`}
          className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-paper"
        >
          Export CSV
        </a>
      </div>

      <form method="get" className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-steel/20 bg-white p-3 sm:grid-cols-5">
        <select name="driverId" defaultValue={driverId ?? ""} className="rounded-lg border border-steel/30 px-2 py-2 text-xs">
          <option value="">All Drivers</option>
          {drivers?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select name="vehicleId" defaultValue={vehicleId ?? ""} className="rounded-lg border border-steel/30 px-2 py-2 text-xs">
          <option value="">All Vehicles</option>
          {vehicles?.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <input type="date" name="start" defaultValue={start ?? ""} className="rounded-lg border border-steel/30 px-2 py-2 text-xs" />
        <input type="date" name="end" defaultValue={end ?? ""} className="rounded-lg border border-steel/30 px-2 py-2 text-xs" />
        <button type="submit" className="rounded-lg bg-ink px-2 py-2 text-xs font-semibold text-paper">
          Filter
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-steel/20 bg-white">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-steel/20 bg-paper text-steel">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Driver</th>
              <th className="px-3 py-2 font-medium">Vehicle</th>
              <th className="px-3 py-2 font-medium">KM</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {trips?.map((t) => (
              <tr key={t.id} className="border-b border-steel/10 last:border-0">
                <td className="px-3 py-2 text-ink">
                  {new Date(t.start_datetime).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short" })}
                </td>
                <td className="px-3 py-2 text-ink">{t.driver?.name}</td>
                <td className="px-3 py-2 text-ink">{t.vehicle?.name}</td>
                <td className="odometer px-3 py-2 font-medium text-ink">
                  {t.kilometres_used != null ? t.kilometres_used.toLocaleString("en-NZ") : "—"}
                </td>
                <td className="px-3 py-2 capitalize text-ink">{t.status}</td>
              </tr>
            ))}
            {(!trips || trips.length === 0) && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-steel">
                  No trips match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

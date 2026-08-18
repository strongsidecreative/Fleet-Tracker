import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function AdminVehicleChecksPage({
  searchParams,
}: {
  searchParams: { vehicleId?: string; driverId?: string; type?: string; result?: string; start?: string; end?: string };
}) {
  const supabase = createClient();
  const { vehicleId, driverId, type, result, start, end } = searchParams;

  const { data: vehicles } = await supabase.from("vehicles").select("id, name").order("name");
  const { data: drivers } = await supabase.from("profiles").select("id, name").eq("role", "driver").order("name");

  let query = supabase
    .from("vehicle_checks")
    .select("*, vehicle:vehicles(name, registration), driver:profiles(name)")
    .order("submitted_at", { ascending: false })
    .limit(300);

  if (vehicleId) query = query.eq("vehicle_id", vehicleId);
  if (driverId) query = query.eq("driver_id", driverId);
  if (type) query = query.eq("check_type", type);
  if (result) query = query.eq("overall_result", result);
  if (start) query = query.gte("submitted_at", `${start}T00:00:00`);
  if (end) query = query.lte("submitted_at", `${end}T23:59:59`);

  const { data: checks } = await query;

  return (
    <div>
      <h1 className="mb-4 font-display text-xl font-bold text-ink">Vehicle Checks</h1>

      <form method="get" className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-steel/20 bg-white p-3 sm:grid-cols-3 md:grid-cols-6">
        <select name="vehicleId" defaultValue={vehicleId ?? ""} className="rounded-lg border border-steel/30 px-2 py-2 text-xs">
          <option value="">All Vehicles</option>
          {vehicles?.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <select name="driverId" defaultValue={driverId ?? ""} className="rounded-lg border border-steel/30 px-2 py-2 text-xs">
          <option value="">All Drivers</option>
          {drivers?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select name="type" defaultValue={type ?? ""} className="rounded-lg border border-steel/30 px-2 py-2 text-xs">
          <option value="">Pre &amp; Post</option>
          <option value="pre">Pre-Operation</option>
          <option value="post">Post-Operation</option>
        </select>
        <select name="result" defaultValue={result ?? ""} className="rounded-lg border border-steel/30 px-2 py-2 text-xs">
          <option value="">Any Result</option>
          <option value="all_ok">All OK</option>
          <option value="issues_reported">Issues Only</option>
        </select>
        <input type="date" name="start" defaultValue={start ?? ""} className="rounded-lg border border-steel/30 px-2 py-2 text-xs" />
        <div className="flex gap-1">
          <input type="date" name="end" defaultValue={end ?? ""} className="w-full rounded-lg border border-steel/30 px-2 py-2 text-xs" />
          <button type="submit" className="rounded-lg bg-ink px-2 py-2 text-xs font-semibold text-paper">
            Go
          </button>
        </div>
      </form>

      <div className="space-y-2">
        {(!checks || checks.length === 0) && <p className="rounded-xl border border-steel/20 bg-white p-4 text-sm text-steel">No checks match these filters.</p>}
        {checks?.map((c) => (
          <Link key={c.id} href={`/admin/vehicle-checks/${c.id}`} className="block rounded-xl border border-steel/20 bg-white p-3">
            <div className="flex items-center justify-between">
              <p className="font-medium text-ink">{c.vehicle?.name}</p>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${c.overall_result === "all_ok" ? "bg-track/15 text-track" : "bg-rust/15 text-rust"}`}>
                {c.overall_result === "all_ok" ? "All OK" : `${c.issue_count} Issue${c.issue_count > 1 ? "s" : ""}`}
              </span>
            </div>
            <p className="mt-1 text-xs text-steel capitalize">
              {c.driver?.name} · {c.check_type}-operation ·{" "}
              {new Date(c.submitted_at).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
              {" · "}
              {c.odometer_snapshot.toLocaleString("en-NZ")} KM · {c.initials}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

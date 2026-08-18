import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { overallSeverity, SEVERITY_BADGE_CLASS, SEVERITY_LABEL } from "@/lib/vehicleAlerts";
import SuccessBanner from "@/components/SuccessBanner";

export default async function AdminVehiclesPage() {
  const supabase = createClient();

  const { data: vehicles } = await supabase.from("vehicles").select("*").order("name");
  const { data: activeTrips } = await supabase
    .from("vehicle_usage")
    .select("*, driver:profiles(name)")
    .eq("status", "active");

  const activeTripFor = (vehicleId: string) => activeTrips?.find((t) => t.vehicle_id === vehicleId);

  return (
    <div>
      <SuccessBanner />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-ink">Vehicles</h1>
        <div className="flex gap-2">
          <a href="/admin/vehicles/export" className="rounded-lg border border-steel/30 px-3 py-2 text-xs font-semibold text-ink">
            Export CSV
          </a>
          <Link href="/admin/vehicles/new" className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-paper">
            Add Vehicle
          </Link>
        </div>
      </div>

      {(!vehicles || vehicles.length === 0) && (
        <p className="rounded-xl border border-steel/20 bg-white p-4 text-sm text-steel">
          No vehicles yet. Add your first one to get started.
        </p>
      )}

      <div className="space-y-2">
        {vehicles?.map((v) => {
          const active = activeTripFor(v.id);
          const severity = overallSeverity(v);

          return (
            <Link
              key={v.id}
              href={`/admin/vehicles/${v.id}`}
              className="block rounded-xl border border-steel/20 bg-white p-3"
            >
              <div className="flex items-center justify-between gap-3">
                {v.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.photo_url} alt={v.name} className="h-12 w-12 flex-shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-paper" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-ink">
                    {v.name} {!v.active && <span className="text-xs text-steel">(inactive)</span>}
                  </p>
                  <p className="text-xs text-steel">
                    {active
                      ? `${active.driver?.name} · since ${new Date(active.start_datetime).toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit" })}`
                      : `Last KM: ${v.current_odometer.toLocaleString("en-NZ")}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                      active ? "bg-amber/15 text-amber" : "bg-track/15 text-track"
                    }`}
                  >
                    {active ? "In Use" : "Available"}
                  </span>
                  {severity !== "ok" && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${SEVERITY_BADGE_CLASS[severity]}`}>
                      {SEVERITY_LABEL[severity]}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

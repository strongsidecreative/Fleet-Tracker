import { createClient } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/nz-time";

export default async function AdminFuelPage({ searchParams }: { searchParams: { vehicleId?: string } }) {
  const supabase = createClient();

  let query = supabase
    .from("fuel_logs")
    .select("*, vehicle:vehicles(name, registration), driver:profiles(name)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (searchParams.vehicleId) {
    query = query.eq("vehicle_id", searchParams.vehicleId);
  }

  const { data: logs } = await query;
  const rows = logs ?? [];

  const totalLitres = rows.reduce((s, l) => s + l.litres, 0);
  const totalCost = rows.reduce((s, l) => s + l.cost, 0);
  const avgPricePerLitre = totalLitres > 0 ? totalCost / totalLitres : 0;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-ink">Fuel</h1>
        <a
          href={`/admin/fuel/export${searchParams.vehicleId ? `?vehicleId=${searchParams.vehicleId}` : ""}`}
          className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-paper"
        >
          Export CSV
        </a>
      </div>

      <p className="mb-4 text-xs text-steel">
        Most recent 200 fuel logs{searchParams.vehicleId ? " for this vehicle" : " across the fleet"}. For
        fuel-to-KM usage by period, see{" "}
        <a href="/admin/reports" className="underline">
          Reports
        </a>
        .
      </p>

      {rows.length > 0 && (
        <div className="mb-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-steel/20 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-steel">Total Litres</p>
            <p className="odometer mt-1 text-xl font-bold text-ink">{totalLitres.toFixed(1)} L</p>
          </div>
          <div className="rounded-xl border border-steel/20 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-steel">Total Spent</p>
            <p className="odometer mt-1 text-xl font-bold text-ink">
              {totalCost.toLocaleString("en-NZ", { style: "currency", currency: "NZD" })}
            </p>
          </div>
          <div className="rounded-xl border border-steel/20 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-steel">Avg $/L</p>
            <p className="odometer mt-1 text-xl font-bold text-ink">
              {avgPricePerLitre.toLocaleString("en-NZ", { style: "currency", currency: "NZD" })}
            </p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-steel/20 bg-white">
        {rows.length === 0 && <p className="p-3 text-sm text-steel">No fuel logged yet.</p>}
        {rows.map((l, i) => (
          <div key={l.id} className={`p-3 text-sm ${i > 0 ? "border-t border-steel/10" : ""}`}>
            <div className="flex items-center justify-between">
              <span className="font-medium text-ink">
                {l.vehicle?.name ?? "Unknown vehicle"} <span className="text-xs text-steel">{l.vehicle?.registration}</span>
              </span>
              <span className="text-xs text-steel">{fmtDate(l.created_at)}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 text-xs text-steel">
              <span>{l.driver?.name ?? "Unknown driver"}</span>
              <span>
                {l.litres.toFixed(1)} L at {l.odometer_km.toLocaleString("en-NZ")} KM
              </span>
              <span className="odometer font-bold text-ink">
                {l.cost.toLocaleString("en-NZ", { style: "currency", currency: "NZD" })}
              </span>
            </div>
            {(l.receipt_photo_url || l.notes) && (
              <div className="mt-1 flex items-center gap-3 text-xs">
                {l.receipt_photo_url && (
                  <a href={l.receipt_photo_url} target="_blank" rel="noreferrer" className="font-medium text-brand underline">
                    View Receipt
                  </a>
                )}
                {l.notes && <span className="text-steel">{l.notes}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { fmtDate } from "@/lib/nz-time";

export default async function MyFuelPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: logs } = await supabase
    .from("fuel_logs")
    .select("*, vehicle:vehicles(name)")
    .eq("driver_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = logs ?? [];
  const totalLitres = rows.reduce((s, l) => s + l.litres, 0);
  const totalCost = rows.reduce((s, l) => s + l.cost, 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-ink">My Fuel</h1>
        <Link href="/fuel/new" className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-paper">
          Log Fuel
        </Link>
      </div>

      {rows.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-steel/20 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-steel">Total Litres</p>
            <p className="odometer mt-1 text-2xl font-bold text-ink">{totalLitres.toFixed(1)} L</p>
          </div>
          <div className="rounded-xl border border-steel/20 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-steel">Total Spent</p>
            <p className="odometer mt-1 text-2xl font-bold text-ink">
              {totalCost.toLocaleString("en-NZ", { style: "currency", currency: "NZD" })}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-steel">No fuel logged yet — last 50 shown.</p>}
        {rows.map((l) => (
          <div key={l.id} className="rounded-xl border border-steel/20 bg-white p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-ink">{l.vehicle?.name ?? "Unknown vehicle"}</span>
              <span className="text-xs text-steel">{fmtDate(l.created_at)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-steel">
              <span>
                {l.litres.toFixed(1)} L at {l.odometer_km.toLocaleString("en-NZ")} KM
              </span>
              <span className="odometer font-bold text-ink">
                {l.cost.toLocaleString("en-NZ", { style: "currency", currency: "NZD" })}
              </span>
            </div>
            {l.receipt_photo_url && (
              <a href={l.receipt_photo_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-medium text-brand underline">
                View Receipt
              </a>
            )}
            {l.notes && <p className="mt-1 text-xs text-steel">{l.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

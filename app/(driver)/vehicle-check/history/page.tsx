import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function VehicleCheckHistoryPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: checks } = await supabase
    .from("vehicle_checks")
    .select("*, vehicle:vehicles(name)")
    .eq("driver_id", user!.id)
    .order("submitted_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-4 font-display text-xl font-bold text-ink">My Vehicle Checks</h1>
      <div className="space-y-2">
        {(!checks || checks.length === 0) && <p className="text-sm text-steel">No vehicle checks completed yet.</p>}
        {checks?.map((c) => (
          <Link key={c.id} href={`/vehicle-check/${c.id}`} className="block rounded-xl border border-steel/20 bg-white p-3">
            <div className="flex items-center justify-between">
              <p className="font-medium text-ink">{c.vehicle?.name}</p>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${c.overall_result === "all_ok" ? "bg-track/15 text-track" : "bg-rust/15 text-rust"}`}>
                {c.overall_result === "all_ok" ? "All OK" : `${c.issue_count} Issue${c.issue_count > 1 ? "s" : ""}`}
              </span>
            </div>
            <p className="mt-1 text-xs text-steel capitalize">
              {c.check_type}-operation ·{" "}
              {new Date(c.submitted_at).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short" })}
              {" · "}
              {c.odometer_snapshot.toLocaleString("en-NZ")} KM
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

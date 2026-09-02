import { createClient } from "@/lib/supabase/server";
import { updateIncidentStatus } from "./actions";

const severityClass: Record<string, string> = {
  low: "bg-steel/10 text-steel",
  medium: "bg-amber/15 text-amber",
  high: "bg-rust/15 text-rust",
};

function formatIncidentDateTime(date?: string | null, time?: string | null) {
  if (!date) return null;
  const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return time ? `${dateLabel}, ${time}` : dateLabel;
}

export default async function AdminIncidentsPage() {
  const supabase = createClient();
  const { data: reports } = await supabase
    .from("incident_reports")
    .select("*, vehicle:vehicles(name), driver:profiles(name)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-4 font-display text-xl font-bold text-ink">Incidents &amp; Vehicle Checks</h1>
      <div className="space-y-2">
        {(!reports || reports.length === 0) && <p className="text-sm text-steel">Nothing reported yet.</p>}
        {reports?.map((i) => {
          const incidentWhen = formatIncidentDateTime(i.incident_date, i.incident_time);
          return (
            <div key={i.id} className="rounded-xl border border-steel/20 bg-white p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-ink">{i.vehicle?.name}</p>
                {i.report_type === "general_check" ? (
                  <span className="rounded-full bg-track/15 px-2 py-0.5 text-xs font-bold capitalize text-track">
                    Check · {i.check_area}
                  </span>
                ) : (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold capitalize ${severityClass[i.severity]}`}>
                    {i.severity}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-ink">{i.description}</p>
              {(incidentWhen || i.location) && (
                <p className="mt-1 text-xs text-steel">
                  {incidentWhen}
                  {incidentWhen && i.location ? " · " : ""}
                  {i.location}
                </p>
              )}
              {i.other_vehicle_damage && (
                <p className="mt-1 text-xs text-ink">
                  <span className="font-semibold">Damage:</span> {i.property_damage_details || "Reported, no details given"}
                </p>
              )}
              {i.police_involved && (
                <p className="mt-1 text-xs text-ink">
                  <span className="font-semibold">Police involved:</span> {i.police_details || "Reported, no details given"}
                </p>
              )}
              {i.witness_involved && (
                <p className="mt-1 text-xs text-ink">
                  <span className="font-semibold">Witness:</span> {i.witness_details || "Reported, no details given"}
                </p>
              )}
              <p className="mt-1 text-xs text-steel">
                {i.driver?.name} ·{" "}
                {new Date(i.created_at).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-steel">Status:</span>
                {["new", "acknowledged", "resolved"].map((s) => (
                  <form key={s} action={updateIncidentStatus.bind(null, i.id, s)}>
                    <button
                      type="submit"
                      disabled={i.status === s}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        i.status === s ? "bg-ink text-paper" : "border border-steel/30 text-steel"
                      }`}
                    >
                      {s}
                    </button>
                  </form>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { createIncidentFromCheckItem } from "@/app/admin/vehicle-checks/[id]/actions";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";

export default function VehicleCheckDetail({
  check,
  items,
  checkId,
  incidentByItemId,
}: {
  check: any;
  items: any[];
  checkId?: string;
  incidentByItemId?: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-steel/20 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-lg font-bold text-ink">{check.vehicle?.name}</p>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              check.overall_result === "all_ok" ? "bg-track/15 text-track" : "bg-rust/15 text-rust"
            }`}
          >
            {check.overall_result === "all_ok" ? "ALL OK" : `${check.issue_count} ISSUE${check.issue_count > 1 ? "S" : ""}`}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-steel">Registration</p>
            <p className="text-ink">{check.vehicle?.registration}</p>
          </div>
          <div>
            <p className="text-xs text-steel">Completed By</p>
            <p className="text-ink">{check.driver?.name}</p>
          </div>
          <div>
            <p className="text-xs text-steel">Check Type</p>
            <p className="capitalize text-ink">{check.check_type}-Operation</p>
          </div>
          <div>
            <p className="text-xs text-steel">Vehicle KM</p>
            <p className="odometer text-ink">{check.odometer_snapshot.toLocaleString("en-NZ")} KM</p>
          </div>
          <div>
            <p className="text-xs text-steel">Date &amp; Time</p>
            <p className="text-ink">
              {new Date(check.submitted_at).toLocaleString("en-NZ", {
                timeZone: "Pacific/Auckland",
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-ink">Checklist</p>
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="rounded-xl border border-steel/20 bg-white p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-ink">{it.item_label}</p>
                <span className={`text-sm font-bold ${it.result === "ok" ? "text-track" : "text-rust"}`}>
                  {it.result === "ok" ? "✓ OK" : "⚠ ISSUE"}
                </span>
              </div>
              {it.comment && <p className="mt-1 text-sm text-steel">{it.comment}</p>}
              {it.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.photo_url}
                  alt={it.item_label}
                  loading="lazy"
                  decoding="async"
                  className="mt-2 h-32 w-full rounded-lg object-cover"
                />
              )}
              {it.result === "issue" && checkId && (
                <div className="mt-2 border-t border-steel/10 pt-2">
                  {incidentByItemId?.[it.id] ? (
                    <a href="/admin/incidents" className="text-xs font-medium text-track underline">
                      Incident created — view in Incidents
                    </a>
                  ) : (
                    <form action={createIncidentFromCheckItem.bind(null, checkId, it.id)}>
                      <ConfirmSubmitButton
                        confirmMessage={`Create an incident report for "${it.item_label}"?`}
                        className="text-xs font-medium text-rust underline"
                      >
                        Create Incident
                      </ConfirmSubmitButton>
                    </form>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-steel/20 bg-white p-4">
        <p className="mb-2 text-sm font-bold text-ink">Sign-Off</p>
        <div className="flex justify-between text-sm">
          <span className="text-steel">Initials</span>
          <span className="font-medium text-ink">{check.initials}</span>
        </div>
        <div className="mt-1 flex justify-between text-sm">
          <span className="text-steel">Confirmed</span>
          <span className="font-medium text-ink">{check.confirmed ? "Yes" : "No"}</span>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { toggleUserActive } from "../users/actions";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import { startOfWeekNZ, startOfMonthNZ } from "@/lib/nz-time";
import SuccessBanner from "@/components/SuccessBanner";
import { licenceSeverity, LICENCE_LABEL, LICENCE_BADGE_CLASS } from "@/lib/licenceStatus";

// Drivers and Admins used to be two separate top-level nav tabs, but both
// are just the `profiles` table filtered by role — this merges them into
// one "People" page with a toggle, instead of two near-identical pages.
export default async function AdminPeoplePage({
  searchParams,
}: {
  searchParams: { role?: string };
}) {
  const role = searchParams.role === "admin" ? "admin" : "driver";
  const supabase = createClient();

  const TabLink = ({ value, label }: { value: string; label: string }) => (
    <Link
      href={`/admin/people?role=${value}`}
      className={`rounded-lg px-3 py-2 text-sm font-semibold ${
        role === value ? "bg-ink text-paper" : "border border-steel/30 text-ink"
      }`}
    >
      {label}
    </Link>
  );

  if (role === "admin") {
    const { data: admins } = await supabase.from("profiles").select("*").eq("role", "admin").order("name");

    return (
      <div>
        <SuccessBanner />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <TabLink value="driver" label="Drivers" />
            <TabLink value="admin" label="Admins" />
          </div>
          <a href="/admin/admins/new" className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-paper">
            Add Admin
          </a>
        </div>
        <div className="space-y-2">
          {admins?.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-steel/20 bg-white p-3">
              <div>
                <p className="font-medium text-ink">
                  {a.name} {!a.active && <span className="text-xs text-steel">(inactive)</span>}
                </p>
                <p className="text-xs text-steel">{a.email}</p>
              </div>
              <form action={toggleUserActive.bind(null, a.id, !a.active)}>
                <ConfirmSubmitButton
                  confirmMessage={
                    a.active
                      ? `Deactivate ${a.name}? They won't be able to log in until reactivated.`
                      : `Reactivate ${a.name}?`
                  }
                  className="text-xs font-medium text-steel underline"
                >
                  {a.active ? "Deactivate" : "Reactivate"}
                </ConfirmSubmitButton>
              </form>
            </div>
          ))}
          {(!admins || admins.length === 0) && (
            <p className="rounded-xl border border-steel/20 bg-white p-4 text-sm text-steel">No admins yet.</p>
          )}
        </div>
        <p className="mt-3 text-xs text-steel">
          Deactivating yourself will lock you out — make sure at least one other admin can log in first.
        </p>
      </div>
    );
  }

  const { data: drivers } = await supabase.from("profiles").select("*").eq("role", "driver").order("name");
  const { data: allTrips } = await supabase
    .from("vehicle_usage")
    .select("*, vehicle:vehicles(name)")
    .eq("status", "completed");
  const { data: activeTrips } = await supabase
    .from("vehicle_usage")
    .select("*, vehicle:vehicles(name)")
    .eq("status", "active");
  const { data: licences } = await supabase.from("driver_licences").select("*");

  const now = new Date();
  const weekStart = startOfWeekNZ(now);
  const monthStart = startOfMonthNZ(now);

  return (
    <div>
      <SuccessBanner />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <TabLink value="driver" label="Drivers" />
          <TabLink value="admin" label="Admins" />
        </div>
        <div className="flex gap-2">
          <a href="/admin/drivers/export" className="rounded-lg border border-steel/30 px-3 py-2 text-xs font-semibold text-ink">
            Export CSV
          </a>
          <a href="/admin/drivers/new" className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-paper">
            Add Driver
          </a>
        </div>
      </div>
      <div className="space-y-2">
        {drivers?.map((d) => {
          const trips = allTrips?.filter((t) => t.driver_id === d.id) ?? [];
          const weekKm = trips.filter((t) => new Date(t.start_datetime) >= weekStart).reduce((s, t) => s + (t.kilometres_used ?? 0), 0);
          const monthKm = trips.filter((t) => new Date(t.start_datetime) >= monthStart).reduce((s, t) => s + (t.kilometres_used ?? 0), 0);
          const totalKm = trips.reduce((s, t) => s + (t.kilometres_used ?? 0), 0);
          const active = activeTrips?.find((t) => t.driver_id === d.id);
          const licence = licences?.find((l) => l.driver_id === d.id);
          const severity = licence ? licenceSeverity(licence.expiry_date) : null;

          return (
            <div key={d.id} className="rounded-xl border border-steel/20 bg-white p-3">
              <div className="flex items-center justify-between">
                <Link href={`/admin/drivers/${d.id}`} className="flex-1">
                  <p className="font-medium text-ink">
                    {d.name} {!d.active && <span className="text-xs text-steel">(inactive)</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-steel">
                    {licence ? `${licence.licence_class ?? "—"} · Expires ${new Date(licence.expiry_date).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland" })}` : "No licence on file"}
                  </p>
                </Link>
                <div className="flex items-center gap-2">
                  {severity && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${LICENCE_BADGE_CLASS[severity]}`}>
                      {LICENCE_LABEL[severity]}
                    </span>
                  )}
                  {active && (
                    <span className="rounded-full bg-amber/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber">
                      In {active.vehicle?.name}
                    </span>
                  )}
                  <form action={toggleUserActive.bind(null, d.id, !d.active)}>
                    <ConfirmSubmitButton
                      confirmMessage={
                        d.active
                          ? `Deactivate ${d.name}? They won't be able to log in until reactivated.`
                          : `Reactivate ${d.name}?`
                      }
                      className="text-xs font-medium text-steel underline"
                    >
                      {d.active ? "Deactivate" : "Reactivate"}
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </div>
              <div className="mt-2 flex justify-between text-xs text-steel">
                <span>Week: {weekKm.toLocaleString("en-NZ")} KM</span>
                <span>Month: {monthKm.toLocaleString("en-NZ")} KM</span>
                <span>Total: {totalKm.toLocaleString("en-NZ")} KM</span>
              </div>
            </div>
          );
        })}
        {(!drivers || drivers.length === 0) && (
          <p className="rounded-xl border border-steel/20 bg-white p-4 text-sm text-steel">
            No drivers yet. Use "Add Driver" above to invite your first one.
          </p>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { toggleUserActive, resendInvite, deactivateDriverFromAdmin } from "../users/actions";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import { startOfWeekNZ, startOfMonthNZ } from "@/lib/nz-time";
import SuccessBanner from "@/components/SuccessBanner";
import ErrorBanner from "@/components/ErrorBanner";
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

  // A profile row is created the moment someone's invited, before they've
  // ever opened the email — so on its own it can't tell "invited, still
  // pending" apart from "actually using the app". last_sign_in_at (null
  // until their first real sign-in) is the one signal that can. One admin
  // call for the whole org rather than per-row, since this page can list
  // dozens of people. If the service role key isn't set up, this silently
  // falls back to showing no one as pending rather than breaking the page.
  let pendingIds = new Set<string>();
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { data: userList } = await createAdminClient().auth.admin.listUsers({ perPage: 1000 });
    pendingIds = new Set((userList?.users ?? []).filter((u) => !u.last_sign_in_at).map((u) => u.id));
  }

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
        <ErrorBanner />
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
                {a.active && pendingIds.has(a.id) && (
                  <span className="mt-1 inline-block rounded-full bg-amber/15 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-amber">
                    Invite pending
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {a.active && pendingIds.has(a.id) && (
                  <form action={resendInvite.bind(null, a.email, "admin")}>
                    <button type="submit" className="text-xs font-medium text-brand underline">
                      Resend invite
                    </button>
                  </form>
                )}
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

  // These four don't depend on each other, so fetch them together.
  const [{ data: drivers }, { data: allTrips }, { data: activeTrips }, { data: licences }] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "driver").order("name"),
    // Only the columns the KM totals below actually use — this table grows
    // without bound over time, and previously pulled every column plus a
    // vehicle-name join for every completed trip ever, just to sum numbers.
    supabase.from("vehicle_usage").select("driver_id, start_datetime, kilometres_used").eq("status", "completed"),
    supabase.from("vehicle_usage").select("*, vehicle:vehicles(name)").eq("status", "active"),
    supabase.from("driver_licences").select("*"),
  ]);

  const now = new Date();
  const weekStart = startOfWeekNZ(now);
  const monthStart = startOfMonthNZ(now);

  return (
    <div>
      <SuccessBanner />
      <ErrorBanner />
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
                    {d.name} {!d.active && <span className="text-xs text-steel">(deactivated)</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-steel">
                    {licence ? `${licence.licence_class ?? "—"} · Expires ${new Date(licence.expiry_date).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland" })}` : "No licence on file"}
                  </p>
                  {d.active && pendingIds.has(d.id) && (
                    <span className="mt-1 inline-block rounded-full bg-amber/15 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-amber">
                      Invite pending
                    </span>
                  )}
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
                  {d.active && pendingIds.has(d.id) && (
                    <form action={resendInvite.bind(null, d.email, "driver")}>
                      <button type="submit" className="text-xs font-medium text-brand underline">
                        Resend invite
                      </button>
                    </form>
                  )}
                  {/* Driver deactivation is one-way now (see deactivateDriverFromAdmin) —
                      it also frees up their real email for a fresh invite, which the
                      database can't cleanly undo, so there's no "Reactivate" once a
                      driver has been deactivated. Their name and full history stay
                      intact everywhere else in the app. */}
                  {d.active && (
                    <form action={deactivateDriverFromAdmin.bind(null, d.id)}>
                      <ConfirmSubmitButton
                        confirmMessage={`Deactivate ${d.name}? This can't be undone. They'll be logged out permanently and their email will be free to invite again — right away, to the same person or someone new. All their trips, bookings, incidents, and checks stay exactly as they are.`}
                        className="text-xs font-medium text-rust underline"
                      >
                        Deactivate
                      </ConfirmSubmitButton>
                    </form>
                  )}
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

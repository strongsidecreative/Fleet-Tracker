import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resendInvite, deactivateDriverFromAdmin, removeDriverPersonalInfoFromAdmin, deletePermanentlyFromAdmin, deleteDriverAndRecordsFromAdmin } from "../users/actions";
import { driverIdsWithHistory } from "../users/history";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import SwipeableRow from "@/components/SwipeableRow";
import { startOfWeekNZ, startOfMonthNZ } from "@/lib/nz-time";
import SuccessBanner from "@/components/SuccessBanner";
import ErrorBanner from "@/components/ErrorBanner";
import { licenceSeverity, LICENCE_LABEL, LICENCE_BADGE_CLASS } from "@/lib/licenceStatus";
import { getCurrentUser } from "@/lib/supabase/current";
import DownloadLink from "@/components/DownloadLink";

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
  // Started now but not awaited yet, so it runs in parallel with the
  // page's other queries below instead of before them.
  const pendingIdsPromise: Promise<Set<string>> = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
        .auth.admin.listUsers({ perPage: 1000 })
        .then(({ data: userList }) => new Set((userList?.users ?? []).filter((u) => !u.last_sign_in_at).map((u) => u.id)))
    : Promise.resolve(new Set<string>());

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
    const [{ data: admins }, pendingIds, me] = await Promise.all([
      supabase.from("profiles").select("*").eq("role", "admin").order("name"),
      pendingIdsPromise,
      getCurrentUser(),
    ]);

    // Same lifecycle as drivers (see the driver rows below): Deactivate
    // (frees the email, deletes outright if they have no history),
    // Remove (clears name + email), Delete permanently or Delete with
    // records. Never offered on your own row, and the last active admin
    // can't be deactivated (enforced in the actions too).
    const inactiveAdminIds = (admins ?? []).filter((a) => !a.active).map((a) => a.id);
    const adminsWithHistory = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? await driverIdsWithHistory(createAdminClient(), inactiveAdminIds)
      : new Set(inactiveAdminIds);
    const activeAdminCount = (admins ?? []).filter((a) => a.active).length;

    const AdminRow = ({ a }: { a: NonNullable<typeof admins>[number] }) => {
      const isMe = a.id === me?.id;
      const personalInfoRemoved = a.email.endsWith("@fleet-tracker.invalid");
      const lastActive = a.active && activeAdminCount <= 1;
      const rowActions = isMe ? null : (
        <>
          {a.active && pendingIds.has(a.id) && (
            <form action={resendInvite.bind(null, a.email, "admin")} className="flex">
              <button type="submit" className="flex h-full min-w-[104px] items-center justify-center bg-brand px-4 text-xs font-semibold text-paper">
                Resend invite
              </button>
            </form>
          )}
          {a.active && !lastActive && (
            <form action={deactivateDriverFromAdmin.bind(null, a.id)} className="flex">
              <ConfirmSubmitButton
                confirmMessage={`Deactivate ${a.name}? They'll be signed out and can't sign in again. Can't be undone (you can invite their email again).`}
                className="flex h-full min-w-[104px] items-center justify-center bg-rust px-4 text-xs font-semibold text-paper"
              >
                Deactivate
              </ConfirmSubmitButton>
            </form>
          )}
          {!a.active && !personalInfoRemoved && (
            <form action={removeDriverPersonalInfoFromAdmin.bind(null, a.id)} className="flex">
              <ConfirmSubmitButton
                confirmMessage={`Remove ${a.name}'s email and name? Can't be undone. Their approvals and history stay, shown as "Removed Admin". The email is free to invite again.`}
                className="flex h-full min-w-[104px] items-center justify-center bg-rust px-4 text-xs font-semibold text-paper"
              >
                Remove
              </ConfirmSubmitButton>
            </form>
          )}
          {!a.active && !adminsWithHistory.has(a.id) && (
            <form action={deletePermanentlyFromAdmin.bind(null, a.id)} className="flex">
              <ConfirmSubmitButton
                confirmMessage={`Permanently delete ${a.name}? They have no history, so nothing else is affected. Can't be undone.`}
                className="flex h-full min-w-[104px] items-center justify-center bg-rust px-4 text-xs font-semibold text-paper"
              >
                Delete permanently
              </ConfirmSubmitButton>
            </form>
          )}
          {!a.active && adminsWithHistory.has(a.id) && (
            <form action={deleteDriverAndRecordsFromAdmin.bind(null, a.id)} className="flex">
              <ConfirmSubmitButton
                confirmMessage={`Delete ${a.name} and ALL their records? Their own trips, bookings, checks, fuel logs, incidents and audit entries are deleted; approvals they made stay but no longer name them. Can't be undone.`}
                className="flex h-full min-w-[104px] items-center justify-center bg-rust px-4 text-xs font-semibold text-paper"
              >
                Delete with records
              </ConfirmSubmitButton>
            </form>
          )}
        </>
      );

      const card = (
        <div className="rounded-xl border border-steel/20 bg-white p-3">
          <p className="font-medium text-ink">
            {a.name}{" "}
            {isMe && <span className="text-xs text-steel">(you)</span>}{" "}
            {!a.active && <span className="text-xs text-steel">{personalInfoRemoved ? "(removed)" : "(deactivated)"}</span>}
          </p>
          <p className="text-xs text-steel">{a.email}</p>
          {a.active && pendingIds.has(a.id) && (
            <span className="mt-1 inline-block rounded-full bg-amber/15 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-amber">
              Invite pending
            </span>
          )}
          {lastActive && !isMe && <p className="mt-1 text-xs text-steel">Last active admin, can&apos;t be deactivated.</p>}
        </div>
      );

      return rowActions ? <SwipeableRow actions={rowActions}>{card}</SwipeableRow> : card;
    };

    const activeAdmins = (admins ?? []).filter((a) => a.active && !pendingIds.has(a.id));
    const pendingAdmins = (admins ?? []).filter((a) => a.active && pendingIds.has(a.id));
    const inactiveAdmins = (admins ?? []).filter((a) => !a.active);
    const AdminSection = ({ title, list }: { title: string; list: typeof activeAdmins }) =>
      list.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-steel">
            {title} ({list.length})
          </p>
          <div className="space-y-2">
            {list.map((a) => (
              <AdminRow key={a.id} a={a} />
            ))}
          </div>
        </div>
      ) : null;

    return (
      <div>
        <SuccessBanner />
        <ErrorBanner />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <TabLink value="driver" label="Drivers" />
            <TabLink value="admin" label="Admins" />
          </div>
          <Link href="/admin/admins/new" className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-paper">
            Add Admin
          </Link>
        </div>
        {(!admins || admins.length === 0) ? (
          <p className="rounded-xl border border-steel/20 bg-white p-4 text-sm text-steel">No admins yet.</p>
        ) : (
          <div className="space-y-5">
            <AdminSection title="Active" list={activeAdmins} />
            <AdminSection title="Pending" list={pendingAdmins} />
            <AdminSection title="Inactive" list={inactiveAdmins} />
          </div>
        )}
        <p className="mt-3 text-xs text-steel">
          Swipe an admin left for actions, same as drivers. You can&apos;t remove yourself or the last active admin.
        </p>
      </div>
    );
  }

  // These four don't depend on each other, so fetch them together.
  const [{ data: drivers }, { data: allTrips }, { data: activeTrips }, { data: licences }, pendingIds] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "driver").order("name"),
    // Only the columns the KM totals below actually use — this table grows
    // without bound over time, and previously pulled every column plus a
    // vehicle-name join for every completed trip ever, just to sum numbers.
    supabase.from("vehicle_usage").select("driver_id, start_datetime, kilometres_used").in("status", ["completed", "corrected"]),
    supabase.from("vehicle_usage").select("*, vehicle:vehicles(name)").eq("status", "active"),
    supabase.from("driver_licences").select("*"),
    pendingIdsPromise,
  ]);

  // Which inactive drivers can be permanently deleted (zero trip/booking/
  // incident/check/fuel history) vs which are stuck as a placeholder
  // forever because the database won't let a row with real history be
  // deleted — see history.ts. Only computed for inactive drivers, and
  // only when the service role key is set; an empty Set just means the
  // "Delete permanently" action stays hidden, never that it's offered
  // incorrectly.
  const inactiveDriverIds = (drivers ?? []).filter((d) => !d.active).map((d) => d.id);
  const driversWithHistory = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? await driverIdsWithHistory(createAdminClient(), inactiveDriverIds)
    : new Set(inactiveDriverIds);

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
          <DownloadLink href="/admin/drivers/export" className="rounded-lg border border-steel/30 px-3 py-2 text-xs font-semibold text-ink">
            Export CSV
          </DownloadLink>
          <Link href="/admin/drivers/new" className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-paper">
            Add Driver
          </Link>
        </div>
      </div>
      {(() => {
        const DriverRow = ({ d }: { d: NonNullable<typeof drivers>[number] }) => {
          const trips = allTrips?.filter((t) => t.driver_id === d.id) ?? [];
          const weekKm = trips.filter((t) => new Date(t.start_datetime) >= weekStart).reduce((s, t) => s + (t.kilometres_used ?? 0), 0);
          const monthKm = trips.filter((t) => new Date(t.start_datetime) >= monthStart).reduce((s, t) => s + (t.kilometres_used ?? 0), 0);
          const totalKm = trips.reduce((s, t) => s + (t.kilometres_used ?? 0), 0);
          const active = activeTrips?.find((t) => t.driver_id === d.id);
          const licence = licences?.find((l) => l.driver_id === d.id);
          const severity = licence ? licenceSeverity(licence.expiry_date) : null;
          // A removed driver's email is swapped to a never-real placeholder
          // (see removeDriverPersonalInfo) — used here to tell "already
          // removed" apart from "just deactivated, not removed yet".
          const personalInfoRemoved = d.email.endsWith("@fleet-tracker.invalid");

          // Driver deactivation is one-way (see deactivateDriverFromAdmin) —
          // it already frees up their real email at the auth level for a
          // fresh invite. Remove is a separate, explicit next step for a
          // deactivated driver: it clears both their real email and their
          // name — everything personally identifying — so nothing of it is
          // left in the database, while every trip, booking, check and
          // fuel log they're attached to stays untouched. Once removed
          // there's nothing left to reactivate into — inviting that
          // person (or anyone else) back happens through the normal Add
          // Driver flow, since the address is fully free.
          //
          // These live in the swipe-reveal actions strip rather than as
          // inline buttons — swipe the row left to see them.
          const rowActions = (
            <>
              {d.active && pendingIds.has(d.id) && (
                <form action={resendInvite.bind(null, d.email, "driver")} className="flex">
                  <button
                    type="submit"
                    className="flex h-full min-w-[104px] items-center justify-center bg-brand px-4 text-xs font-semibold text-paper"
                  >
                    Resend invite
                  </button>
                </form>
              )}
              {d.active && (
                <form action={deactivateDriverFromAdmin.bind(null, d.id)} className="flex">
                  <ConfirmSubmitButton
                    confirmMessage={`Deactivate ${d.name}? Can't be undone.`}
                    className="flex h-full min-w-[104px] items-center justify-center bg-rust px-4 text-xs font-semibold text-paper"
                  >
                    Deactivate
                  </ConfirmSubmitButton>
                </form>
              )}
              {!d.active && !personalInfoRemoved && (
                <form action={removeDriverPersonalInfoFromAdmin.bind(null, d.id)} className="flex">
                  <ConfirmSubmitButton
                    confirmMessage={`Remove ${d.name}'s email and name? Can't be undone. Their trip, booking, check and fuel history stays, but every record will show as "Removed Driver" from now on. The email address is free to invite again afterwards.`}
                    className="flex h-full min-w-[104px] items-center justify-center bg-rust px-4 text-xs font-semibold text-paper"
                  >
                    Remove
                  </ConfirmSubmitButton>
                </form>
              )}
              {!d.active && !driversWithHistory.has(d.id) && (
                <form action={deletePermanentlyFromAdmin.bind(null, d.id)} className="flex">
                  <ConfirmSubmitButton
                    confirmMessage={`Permanently delete ${d.name}? This removes them completely — can't be undone, and there's no record left afterwards. They have no trip, booking, check or fuel history, so nothing else is affected.`}
                    className="flex h-full min-w-[104px] items-center justify-center bg-rust px-4 text-xs font-semibold text-paper"
                  >
                    Delete permanently
                  </ConfirmSubmitButton>
                </form>
              )}
              {!d.active && driversWithHistory.has(d.id) && (
                <form action={deleteDriverAndRecordsFromAdmin.bind(null, d.id)} className="flex">
                  <ConfirmSubmitButton
                    confirmMessage={`Delete ${d.name} and ALL their records? Every trip, booking, vehicle check, fuel log and incident report they're attached to is deleted too. Can't be undone.`}
                    className="flex h-full min-w-[104px] items-center justify-center bg-rust px-4 text-xs font-semibold text-paper"
                  >
                    Delete with records
                  </ConfirmSubmitButton>
                </form>
              )}
            </>
          );

          return (
            <SwipeableRow actions={rowActions}>
              <div className="rounded-xl border border-steel/20 bg-white p-3">
                <div className="flex items-center justify-between">
                  <Link href={`/admin/drivers/${d.id}`} className="flex-1">
                    <p className="font-medium text-ink">
                      {d.name}{" "}
                      {!d.active && (
                        <span className="text-xs text-steel">
                          {personalInfoRemoved ? "(removed)" : "(deactivated)"}
                        </span>
                      )}
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
                  </div>
                </div>
                <div className="mt-2 flex justify-between text-xs text-steel">
                  <span>Week: {weekKm.toLocaleString("en-NZ")} KM</span>
                  <span>Month: {monthKm.toLocaleString("en-NZ")} KM</span>
                  <span>Total: {totalKm.toLocaleString("en-NZ")} KM</span>
                </div>
              </div>
            </SwipeableRow>
          );
        };

        // Split into three groups instead of one flat list: a driver
        // that's been deactivated is very different from one who's just
        // never signed in yet (pending invite), and both are different
        // from someone actively driving — mixing them together made it
        // easy to miss a stale invite buried among active drivers.
        const activeDrivers = (drivers ?? []).filter((d) => d.active && !pendingIds.has(d.id));
        const pendingDrivers = (drivers ?? []).filter((d) => d.active && pendingIds.has(d.id));
        const inactiveDrivers = (drivers ?? []).filter((d) => !d.active);

        const Section = ({ title, list }: { title: string; list: typeof activeDrivers }) =>
          list.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-steel">
                {title} ({list.length})
              </p>
              <div className="space-y-2">
                {list.map((d) => (
                  <DriverRow key={d.id} d={d} />
                ))}
              </div>
            </div>
          ) : null;

        if (!drivers || drivers.length === 0) {
          return (
            <p className="rounded-xl border border-steel/20 bg-white p-4 text-sm text-steel">
              No drivers yet. Use "Add Driver" above to invite your first one.
            </p>
          );
        }

        return (
          <div className="space-y-5">
            <Section title="Active" list={activeDrivers} />
            <Section title="Pending" list={pendingDrivers} />
            <Section title="Inactive" list={inactiveDrivers} />
          </div>
        );
      })()}
    </div>
  );
}

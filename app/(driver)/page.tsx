import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { startOfWeekNZ, startOfMonthNZ } from "@/lib/nz-time";
import SuccessBanner from "@/components/SuccessBanner";
import { getViewerFeatures } from "@/lib/orgFeatures.server";

export default async function DriverDashboard({ searchParams }: { searchParams: { featureDisabled?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("name, role").eq("id", user!.id).single();

  // "/" is the PWA's install start_url, so an admin who opens the app
  // from their home-screen icon (or a stale bookmark, or an
  // already-active session) lands here directly rather than going
  // through the login form's role-based redirect. Send them on to the
  // admin dashboard instead of showing the driver home screen.
  if (profile?.role === "admin") {
    redirect("/admin");
  }

  const [{ data: activeTrip }, { data: completedTrips }, features] = await Promise.all([
    supabase
      .from("vehicle_usage")
      .select("*, vehicle:vehicles(name, photo_url)")
      .eq("driver_id", user!.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("vehicle_usage")
      .select("*, vehicle:vehicles(name)")
      .eq("driver_id", user!.id)
      .eq("status", "completed")
      .order("start_datetime", { ascending: false }),
    // Vehicle Check / Report an Incident below are only shown when this
    // organisation's admin hasn't switched them off — middleware.ts is
    // what actually blocks the pages if someone still has an old link.
    getViewerFeatures(supabase, user!.id),
  ]);

  const trips = completedTrips ?? [];
  const now = new Date();
  const weekStart = startOfWeekNZ(now);
  const monthStart = startOfMonthNZ(now);

  const weekTrips = trips.filter((t) => new Date(t.start_datetime) >= weekStart);
  const monthTrips = trips.filter((t) => new Date(t.start_datetime) >= monthStart);
  const weekKm = weekTrips.reduce((s, t) => s + (t.kilometres_used ?? 0), 0);
  const monthKm = monthTrips.reduce((s, t) => s + (t.kilometres_used ?? 0), 0);
  const totalKm = trips.reduce((s, t) => s + (t.kilometres_used ?? 0), 0);
  const recent = trips.slice(0, 5);

  return (
    <div className="space-y-5">
      <SuccessBanner />
      {searchParams.featureDisabled && (
        <p className="rounded-lg bg-paper px-3 py-2 text-xs font-medium text-steel">
          That feature isn't available for your organisation right now.
        </p>
      )}
      <h1 className="font-display text-2xl font-semibold text-ink">Kia ora, {profile?.name}</h1>

      {activeTrip ? (
        <div data-tour="driver-scan-card" className="rounded-2xl border border-amber/40 bg-amber/10 p-4">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-amber">Current Vehicle</p>
          {activeTrip.vehicle?.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeTrip.vehicle.photo_url}
              alt={activeTrip.vehicle.name}
              className="mb-2 h-32 w-full rounded-lg object-cover"
            />
          )}
          <p className="mb-2 font-display text-lg font-bold text-ink">{activeTrip.vehicle?.name}</p>
          <div className="mb-3 flex gap-4 text-sm text-ink">
            <span>Started {new Date(activeTrip.start_datetime).toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}</span>
            <span>Start KM: {activeTrip.start_km.toLocaleString("en-NZ")}</span>
          </div>
          <Link
            href="/scan"
            className="block w-full rounded-xl bg-ink py-3 text-center text-base font-semibold text-paper"
          >
            Scan to Finish
          </Link>
        </div>
      ) : (
        <div data-tour="driver-scan-card" className="rounded-2xl border border-steel/20 bg-white p-4 text-center">
          <p className="mb-3 text-sm text-steel">No vehicle currently in use</p>
          <Link
            href="/scan"
            className="inline-block rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-paper"
          >
            Scan Vehicle QR
          </Link>
        </div>
      )}

      <div data-tour="driver-stats" className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-steel/20 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-steel">This Week</p>
          <p className="odometer mt-1 text-2xl font-bold text-ink">{weekKm.toLocaleString("en-NZ")} KM</p>
        </div>
        <div className="rounded-xl border border-steel/20 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-steel">This Month</p>
          <p className="odometer mt-1 text-2xl font-bold text-ink">{monthKm.toLocaleString("en-NZ")} KM</p>
        </div>
        <div className="rounded-xl border border-steel/20 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-steel">Trips This Month</p>
          <p className="odometer mt-1 text-2xl font-bold text-ink">{monthTrips.length}</p>
        </div>
        <div className="rounded-xl border border-steel/20 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-steel">Total Recorded</p>
          <p className="odometer mt-1 text-2xl font-bold text-ink">{totalKm.toLocaleString("en-NZ")} KM</p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-ink">Recent Vehicle Use</p>
        <div className="space-y-2">
          {recent.length === 0 && <p className="text-sm text-steel">No trips yet.</p>}
          {recent.map((t) => (
            <div key={t.id} className="rounded-xl border border-steel/20 bg-white p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink">{t.vehicle?.name}</span>
                <span className="text-xs text-steel">
                  {new Date(t.start_datetime).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short" })}
                </span>
              </div>
              <div className="mt-1 flex justify-between text-xs text-steel">
                <span>
                  {t.start_km.toLocaleString("en-NZ")} → {t.end_km?.toLocaleString("en-NZ")} KM
                </span>
                <span className="odometer font-bold text-ink">{t.kilometres_used?.toLocaleString("en-NZ")} KM</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div data-tour="driver-quick-actions" className="space-y-2">
        <Link
          href="/bookings/new"
          className="flex items-center justify-center rounded-xl border border-steel/30 bg-white py-3 text-sm font-semibold text-ink"
        >
          Book a Vehicle
        </Link>
        {features.vehicle_checks && (
          <Link
            href="/vehicle-check"
            className="flex items-center justify-center rounded-xl border border-brand/40 bg-brand/10 py-3 text-sm font-semibold text-brand"
          >
            Vehicle Check
          </Link>
        )}
        {features.incident_reports && (
          <Link
            href="/report-incident"
            className="flex items-center justify-center rounded-xl border border-rust/40 bg-rust/10 py-3 text-sm font-semibold text-rust"
          >
            Report an Incident
          </Link>
        )}
      </div>
    </div>
  );
}

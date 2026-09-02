import { createClient } from "@/lib/supabase/server";
import { StartTripForm, FinishTripForm } from "./VehicleForms";
import OverrideBookingForm from "./OverrideBookingForm";
import Link from "next/link";
import { getViewerFeatures } from "@/lib/orgFeatures.server";
import { isComplianceCheckDayNZ, isTodayNZ } from "@/lib/nz-time";

export default async function VehiclePage({ params }: { params: { qr_identifier: string } }) {
  const supabase = createClient();

  // These two don't depend on each other — run them together instead of
  // waiting for the user lookup before even starting the vehicle lookup.
  const [
    {
      data: { user },
    },
    { data: vehicle },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("vehicles").select("*").eq("qr_identifier", params.qr_identifier).single(),
  ]);

  if (!vehicle || !vehicle.active) {
    return (
      <div>
        <p className="text-sm text-steel">This vehicle isn't currently active. Check with an admin.</p>
      </div>
    );
  }

  // Everything below only needs vehicle.id / user.id, both already known —
  // none of these five depend on each other's result, so they used to run
  // as five separate round trips one after another (the whole reason
  // scanning a QR code felt slow). Firing them together turns that into
  // one round trip's worth of wall-clock time.
  const nowIso = new Date().toISOString();
  const wantsComplianceCheckToday = isComplianceCheckDayNZ();

  const [
    { data: profile },
    features,
    { data: activeTrip },
    { data: myActiveElsewhere },
    { data: reservedBooking },
    { data: todaysChecks },
  ] = await Promise.all([
    supabase.from("profiles").select("name, role").eq("id", user!.id).single(),
    getViewerFeatures(supabase, user!.id),
    supabase
      .from("vehicle_usage")
      .select("*, driver:profiles(name)")
      .eq("vehicle_id", vehicle.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("vehicle_usage")
      .select("*, vehicle:vehicles(name)")
      .eq("driver_id", user!.id)
      .eq("status", "active")
      .neq("vehicle_id", vehicle.id)
      .maybeSingle(),
    // Only an APPROVED booking reserves the vehicle — a pending request
    // never blocks anyone, per the approval workflow.
    supabase
      .from("bookings")
      .select("*, driver:profiles(name)")
      .eq("vehicle_id", vehicle.id)
      .eq("approval_status", "approved")
      .in("booking_status", ["upcoming", "active"])
      .lte("start_datetime", nowIso)
      .gte("end_datetime", nowIso)
      .maybeSingle(),
    // Fetched unconditionally alongside everything else (cheap, and its
    // own result isn't needed to decide whether to run it) — only used
    // below if this org actually has Vehicle Checks turned on.
    wantsComplianceCheckToday
      ? supabase
          .from("vehicle_checks")
          .select("created_at")
          .eq("vehicle_id", vehicle.id)
          .eq("driver_id", user!.id)
          .eq("check_type", "pre")
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: null as { created_at: string }[] | null }),
  ]);

  const isAdmin = profile?.role === "admin";

  // Compulsory pre-operation check on Mondays and Fridays — a driver's
  // first scan of this vehicle on one of those days must be preceded by
  // a completed Pre-Operation check for it, that same day. Skipped
  // entirely if this organisation has turned Vehicle Checks off, since
  // there'd be no way to satisfy it. startTrip() in actions.ts enforces
  // the same rule server-side; this is what drives the actual UI.
  let needsComplianceCheck = false;
  if (features.vehicle_checks && wantsComplianceCheckToday) {
    needsComplianceCheck = !(todaysChecks ?? []).some((c) => isTodayNZ(c.created_at));
  }

  if (activeTrip && activeTrip.driver_id !== user!.id) {
    return (
      <div className="space-y-3 rounded-xl border border-amber/40 bg-amber/10 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-amber">Vehicle Currently In Use</p>
        <p className="font-display text-lg font-bold text-ink">{vehicle.name}</p>
        <p className="text-sm text-ink">Driver: {activeTrip.driver?.name}</p>
        <p className="text-sm text-ink">Started: {new Date(activeTrip.start_datetime).toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}</p>
        <p className="text-sm text-ink">Starting KM: {activeTrip.start_km.toLocaleString("en-NZ")}</p>
      </div>
    );
  }

  if (activeTrip && activeTrip.driver_id === user!.id) {
    return (
      <div className="space-y-4 rounded-xl border border-steel/20 bg-white p-4">
        <h1 className="font-display text-xl font-semibold text-ink">Finish Vehicle Use</h1>
        <div>
          <p className="text-xs text-steel">Driver</p>
          <p className="font-medium text-ink">{profile?.name}</p>
        </div>
        <div>
          <p className="text-xs text-steel">Vehicle</p>
          <p className="font-medium text-ink">{vehicle.name}</p>
        </div>
        <div>
          <p className="text-xs text-steel">Starting KM</p>
          <p className="odometer text-lg font-bold text-ink">{activeTrip.start_km.toLocaleString("en-NZ")}</p>
        </div>
        <FinishTripForm tripId={activeTrip.id} startKm={activeTrip.start_km} />
      </div>
    );
  }

  if (myActiveElsewhere) {
    return (
      <div className="space-y-3 rounded-xl border border-rust/40 bg-rust/10 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-rust">You Already Have A Vehicle In Use</p>
        <p className="text-sm text-ink">
          Finish your trip on {myActiveElsewhere.vehicle?.name} before starting another vehicle.
        </p>
        <Link href="/" className="inline-block text-sm font-medium text-ink underline">
          View my current vehicle
        </Link>
      </div>
    );
  }

  if (reservedBooking && reservedBooking.driver_id !== user!.id) {
    return (
      <div className="space-y-3 rounded-xl border border-steel/30 bg-paper p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-steel">Vehicle Reserved</p>
        <p className="font-display text-lg font-bold text-ink">{vehicle.name}</p>
        <p className="text-sm text-ink">
          This vehicle is currently reserved by {reservedBooking.driver?.name} until{" "}
          {new Date(reservedBooking.end_datetime).toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}.
        </p>
        {isAdmin ? (
          <OverrideBookingForm bookingId={reservedBooking.id} vehicleName={vehicle.name} />
        ) : (
          <p className="text-xs text-steel">You can start this vehicle once the booking ends.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reservedBooking && reservedBooking.driver_id === user!.id && (
        <p className="rounded-lg bg-track/10 px-3 py-2 text-xs font-medium text-track">
          This is your booked time slot, until{" "}
          {new Date(reservedBooking.end_datetime).toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}.
        </p>
      )}
      <div className="space-y-4 rounded-xl border border-steel/20 bg-white p-4">
        {vehicle.photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={vehicle.photo_url} alt={vehicle.name} className="h-40 w-full rounded-lg object-cover" />
        )}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-steel">Registration</p>
            <p className="font-medium text-ink">{vehicle.registration}</p>
          </div>
        </div>
        <div>
          <p className="text-xs text-steel">Driver</p>
          <p className="font-medium text-ink">{profile?.name}</p>
        </div>
        <div>
          <p className="text-xs text-steel">Current Odometer</p>
          <p className="odometer text-xl font-bold text-ink">{vehicle.current_odometer.toLocaleString("en-NZ")} KM</p>
        </div>
        {needsComplianceCheck ? (
          <div className="space-y-3 rounded-xl border border-amber/40 bg-amber/10 p-3">
            <p className="text-sm font-semibold text-ink">Vehicle check required before you can start</p>
            <p className="text-xs text-steel">
              Pre-Operation checks are compulsory on Mondays and Fridays. Complete one for {vehicle.name}, then
              scan this vehicle again to start your trip.
            </p>
            <Link
              href={`/vehicle-check?vehicleId=${vehicle.id}`}
              className="block w-full rounded-xl bg-ink py-3 text-center text-base font-semibold text-paper"
            >
              Do Vehicle Check Now
            </Link>
          </div>
        ) : (
          <StartTripForm vehicleId={vehicle.id} defaultKm={vehicle.current_odometer} />
        )}
      </div>

      {(features.vehicle_checks || features.incident_reports) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {features.vehicle_checks && (
            <Link
              href={`/vehicle-check?vehicleId=${vehicle.id}`}
              className="flex-1 rounded-xl border border-brand/40 bg-brand/10 py-2.5 text-center text-sm font-semibold text-brand"
            >
              Vehicle Check
            </Link>
          )}
          {features.incident_reports && (
            <Link
              href={`/report-incident?vehicleId=${vehicle.id}`}
              className="flex-1 rounded-xl border border-rust/40 bg-rust/10 py-2.5 text-center text-sm font-semibold text-rust"
            >
              Report Incident
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

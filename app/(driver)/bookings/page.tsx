import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { cancelBooking } from "./actions";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import SuccessBanner from "@/components/SuccessBanner";

function fmtRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const today = new Date();
  const dayLabel =
    s.toDateString() === today.toDateString()
      ? "Today"
      : s.toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short" });
  return `${dayLabel} ${s.toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit" })}–${e.toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit" })}`;
}

function StatusBadge({ b }: { b: any }) {
  if (b.approval_status === "pending") {
    return <span className="rounded-full bg-amber/15 px-2 py-0.5 text-xs font-bold text-amber">Awaiting Approval</span>;
  }
  if (b.approval_status === "declined") {
    return <span className="rounded-full bg-rust/15 px-2 py-0.5 text-xs font-bold text-rust">Declined</span>;
  }
  if (b.booking_status === "cancelled") {
    return <span className="rounded-full bg-steel/15 px-2 py-0.5 text-xs font-bold text-steel">Cancelled</span>;
  }
  if (b.booking_status === "active") {
    return <span className="rounded-full bg-track/15 px-2 py-0.5 text-xs font-bold text-track">Active</span>;
  }
  if (b.booking_status === "completed") {
    return <span className="rounded-full bg-steel/15 px-2 py-0.5 text-xs font-bold text-steel">Completed</span>;
  }
  return <span className="rounded-full bg-track/15 px-2 py-0.5 text-xs font-bold text-track">Upcoming</span>;
}

function BookingCard({ b, vehicleName, showCancel }: { b: any; vehicleName: string; showCancel: boolean }) {
  return (
    <div className="rounded-xl border border-steel/20 bg-white p-3">
      <div className="flex items-center justify-between">
        <p className="font-medium text-ink">{b.title || "Booking"}</p>
        <StatusBadge b={b} />
      </div>
      <p className="mt-1 text-xs text-steel">
        {vehicleName} · {fmtRange(b.start_datetime, b.end_datetime)}
      </p>
      {b.approval_status === "declined" && b.decision_note && (
        <p className="mt-1 text-xs text-rust">Reason: {b.decision_note}</p>
      )}
      {b.notes && <p className="mt-1 text-xs text-steel">{b.notes}</p>}
      {showCancel && (
        <div className="mt-2 flex gap-2">
          <Link href={`/bookings/${b.id}/edit`} className="text-xs font-medium text-brand underline">
            Edit
          </Link>
          <form action={cancelBooking.bind(null, b.id, "this")}>
            <ConfirmSubmitButton confirmMessage="Cancel this booking?" className="text-xs font-medium text-rust">
              Cancel
            </ConfirmSubmitButton>
          </form>
          {b.series_id && (
            <form action={cancelBooking.bind(null, b.id, "future")}>
              <ConfirmSubmitButton confirmMessage="Cancel this and all future occurrences in the series?" className="text-xs font-medium text-rust underline">
                Cancel this &amp; future
              </ConfirmSubmitButton>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default async function DriverBookingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, vehicle:vehicles(name)")
    .eq("driver_id", user!.id)
    .order("start_datetime", { ascending: true });

  const rows = bookings ?? [];
  const now = new Date();

  const awaiting = rows.filter((b) => b.approval_status === "pending" && b.booking_status !== "cancelled");
  const upcoming = rows.filter(
    (b) => b.approval_status === "approved" && b.booking_status === "upcoming" && new Date(b.start_datetime) > now
  );
  const active = rows.filter((b) => b.approval_status === "approved" && b.booking_status === "active");
  const past = rows
    .filter(
      (b) =>
        b.booking_status === "completed" ||
        b.booking_status === "cancelled" ||
        b.approval_status === "declined" ||
        (b.approval_status === "approved" && b.booking_status === "upcoming" && new Date(b.start_datetime) <= now)
    )
    .sort((a, b) => new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime());

  return (
    <div>
      <SuccessBanner />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-ink">My Bookings</h1>
        <Link href="/bookings/new" className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-paper">
          New
        </Link>
      </div>

      {[
        { label: "Awaiting Approval", items: awaiting, cancel: true },
        { label: "Upcoming", items: upcoming, cancel: true },
        { label: "Active", items: active, cancel: false },
        { label: "Past", items: past.slice(0, 20), cancel: false },
      ].map((section) => (
        <div key={section.label} className="mb-5">
          <p className="mb-2 text-sm font-bold text-ink">{section.label}</p>
          <div className="space-y-2">
            {section.items.length === 0 && <p className="text-sm text-steel">Nothing here.</p>}
            {section.items.map((b) => (
              <BookingCard key={b.id} b={b} vehicleName={b.vehicle?.name ?? "To Be Assigned"} showCancel={section.cancel} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

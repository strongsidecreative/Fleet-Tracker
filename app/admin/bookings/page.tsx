import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import SuccessBanner from "@/components/SuccessBanner";
import { adminCancelBooking } from "./actions";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";

function fmtRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short" })} ${s.toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit" })}–${e.toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit" })}`;
}

export default async function AdminBookingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: allPending } = await supabase
    .from("bookings")
    .select("*, vehicle:vehicles(name), driver:profiles(name)")
    .eq("approval_status", "pending")
    .order("start_datetime", { ascending: true });

  // De-duplicate recurring series down to one card each, using the earliest occurrence.
  const seenSeries = new Set<string>();
  const pendingCards = (allPending ?? []).filter((b) => {
    if (!b.series_id) return true;
    if (seenSeries.has(b.series_id)) return false;
    seenSeries.add(b.series_id);
    return true;
  });

  const myPending = pendingCards.filter((b) => b.approving_admin_id === user!.id);
  const otherPending = pendingCards.filter((b) => b.approving_admin_id !== user!.id);

  const nowIso = new Date().toISOString();
  const { data: confirmed } = await supabase
    .from("bookings")
    .select("*, vehicle:vehicles(name), driver:profiles(name)")
    .eq("approval_status", "approved")
    .in("booking_status", ["upcoming", "active"])
    .gte("end_datetime", nowIso)
    .order("start_datetime", { ascending: true })
    .limit(50);

  return (
    <div>
      <SuccessBanner />
      <h1 className="mb-4 font-display text-xl font-bold text-ink">
        Booking Requests {pendingCards.length > 0 && <span className="text-brand">({pendingCards.length})</span>}
      </h1>

      <p className="mb-2 text-sm font-bold text-ink">Awaiting My Approval</p>
      <div className="mb-5 space-y-2">
        {myPending.length === 0 && <p className="text-sm text-steel">Nothing waiting on you.</p>}
        {myPending.map((b) => (
          <Link key={b.id} href={`/admin/bookings/${b.id}`} className="block rounded-xl border border-amber/40 bg-amber/5 p-3">
            <div className="flex items-center justify-between">
              <p className="font-medium text-ink">{b.title || "Booking"}</p>
              {b.series_id && <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs font-bold text-brand">Recurring</span>}
            </div>
            <p className="mt-1 text-xs text-steel">
              {b.driver?.name} · {b.vehicle?.name ?? "To Be Assigned"} · {fmtRange(b.start_datetime, b.end_datetime)}
            </p>
          </Link>
        ))}
      </div>

      {otherPending.length > 0 && (
        <>
          <p className="mb-2 text-sm font-bold text-ink">Other Pending Requests</p>
          <div className="mb-5 space-y-2">
            {otherPending.map((b) => (
              <Link key={b.id} href={`/admin/bookings/${b.id}`} className="block rounded-xl border border-steel/20 bg-white p-3">
                <p className="font-medium text-ink">{b.title || "Booking"}</p>
                <p className="mt-1 text-xs text-steel">
                  {b.driver?.name} · {b.vehicle?.name ?? "To Be Assigned"} · {fmtRange(b.start_datetime, b.end_datetime)} · Approver: {b.approving_admin_id ? "assigned" : "—"}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}

      <p className="mb-2 text-sm font-bold text-ink">Confirmed Upcoming</p>
      <div className="space-y-2">
        {(!confirmed || confirmed.length === 0) && <p className="text-sm text-steel">No confirmed upcoming bookings.</p>}
        {confirmed?.map((b) => (
          <div key={b.id} className="rounded-xl border border-steel/20 bg-white p-3">
            <div className="flex items-center justify-between">
              <p className="font-medium text-ink">{b.title || "Booking"}</p>
              <form action={adminCancelBooking.bind(null, b.id)}>
                <ConfirmSubmitButton confirmMessage={`Cancel ${b.driver?.name}'s booking?`} className="text-xs font-medium text-rust">
                  Cancel
                </ConfirmSubmitButton>
              </form>
            </div>
            <p className="mt-1 text-xs text-steel">
              {b.driver?.name} · {b.vehicle?.name} · {fmtRange(b.start_datetime, b.end_datetime)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

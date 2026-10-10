import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { markNotificationRead, markAllNotificationsRead, clearNotification, clearAllNotifications } from "./actions";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import { getCurrentUser } from "@/lib/supabase/current";

const OPEN_LABELS: Record<string, string> = {
  booking_created: "View booking",
  booking_override: "View booking",
  incident_report: "View incident",
  vehicle_check_issue: "View check",
  maintenance_due: "View vehicle",
  licence_expiring: "View driver",
  receipt_export_due: "Get receipts",
};

export default async function AdminNotificationsPage() {
  const supabase = createClient();
  const user = await getCurrentUser();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", user!.id)
    .is("cleared_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-ink">Notifications</h1>
        {notifications && notifications.length > 0 && (
          <div className="flex items-center gap-4">
            {notifications.some((n) => !n.read) && (
              <form action={markAllNotificationsRead}>
                <button type="submit" className="text-xs font-medium text-steel underline">
                  Mark all as read
                </button>
              </form>
            )}
            <form action={clearAllNotifications}>
              <ConfirmSubmitButton
                confirmMessage="Clear all notifications? They'll be removed from this list."
                className="text-xs font-medium text-rust underline"
              >
                Clear all
              </ConfirmSubmitButton>
            </form>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {(!notifications || notifications.length === 0) && <p className="text-sm text-steel">Nothing to show.</p>}
        {notifications?.map((n) => {
          const rowClass = `rounded-xl border p-3 ${n.read ? "border-steel/20 bg-white" : "border-amber/40 bg-amber/10"}`;

          return (
            <div key={n.id} className={rowClass}>
              <div className="flex items-start justify-between gap-2">
                <Link href={`/notifications/open/${n.id}`} prefetch={false} className="group flex-1 text-sm font-medium text-ink">
                  {n.message}
                  <span className="ml-1 whitespace-nowrap text-brand underline group-hover:no-underline">
                    {OPEN_LABELS[n.type] ?? "View"} →
                  </span>
                </Link>
                <div className="flex flex-shrink-0 items-center gap-3">
                  {!n.read && (
                    <form action={markNotificationRead.bind(null, n.id)}>
                      <button type="submit" className="text-xs font-medium text-steel underline">
                        Mark read
                      </button>
                    </form>
                  )}
                  <form action={clearNotification.bind(null, n.id)}>
                    <button type="submit" aria-label="Clear notification" className="text-xs font-medium text-steel underline">
                      Clear
                    </button>
                  </form>
                </div>
              </div>
              <p className="mt-0.5 text-xs text-steel">
                {new Date(n.created_at).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

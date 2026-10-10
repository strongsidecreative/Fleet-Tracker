import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { markNotificationRead, markAllNotificationsRead, clearNotification, clearAllNotifications } from "./actions";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import { getCurrentUser } from "@/lib/supabase/current";

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
                <p className="text-sm font-medium text-ink">
                  {n.message}
                  {n.type === "receipt_export_due" && (
                    <Link href="/admin/fuel/receipts" className="ml-1 text-brand underline">
                      Get receipts
                    </Link>
                  )}
                </p>
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

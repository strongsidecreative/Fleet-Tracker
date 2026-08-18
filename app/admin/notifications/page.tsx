import { createClient } from "@/lib/supabase/server";
import { markNotificationRead, markAllNotificationsRead } from "./actions";

export default async function AdminNotificationsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-ink">Notifications</h1>
        {notifications && notifications.length > 0 && (
          <form action={markAllNotificationsRead}>
            <button type="submit" className="text-xs font-medium text-steel underline">
              Mark all as read
            </button>
          </form>
        )}
      </div>

      <div className="space-y-2">
        {(!notifications || notifications.length === 0) && <p className="text-sm text-steel">Nothing to show.</p>}
        {notifications?.map((n) => {
          const rowClass = `rounded-xl border p-3 ${n.read ? "border-steel/20 bg-white" : "border-amber/40 bg-amber/10"}`;

          return (
            <div key={n.id} className={rowClass}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-ink">{n.message}</p>
                {!n.read && (
                  <form action={markNotificationRead.bind(null, n.id)}>
                    <button type="submit" className="flex-shrink-0 text-xs font-medium text-steel underline">
                      Mark read
                    </button>
                  </form>
                )}
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

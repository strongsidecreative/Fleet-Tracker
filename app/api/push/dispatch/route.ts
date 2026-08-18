import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToSubscriptions } from "@/lib/push";

// Called by a Postgres trigger (see supabase/migrations/0012_push_notifications.sql)
// every time a row is inserted into `notifications` — admin actions, driver
// actions, and scheduled compliance/licence checks all funnel through that
// one table, so this one route covers every notification type without
// needing a push call added at each place a notification gets created.

const TITLES: Record<string, string> = {
  maintenance_due: "Vehicle Compliance Alert",
  incident_report: "Incident Reported",
  licence_expiring: "Driver Licence Alert",
  vehicle_check_issue: "Vehicle Check Issue",
  booking_created: "New Booking Request",
  booking_approved: "Booking Approved",
  booking_declined: "Booking Declined",
  booking_override: "Booking Override",
};

// Where tapping the push notification should take the recipient.
const ADMIN_URL = "/admin/notifications";
const DRIVER_URL = "/bookings";
const URLS: Record<string, string> = {
  maintenance_due: ADMIN_URL,
  incident_report: ADMIN_URL,
  licence_expiring: ADMIN_URL,
  vehicle_check_issue: ADMIN_URL,
  booking_created: ADMIN_URL,
  booking_approved: DRIVER_URL,
  booking_declined: DRIVER_URL,
  booking_override: DRIVER_URL,
};

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-push-secret");
  if (!secret || secret !== process.env.PUSH_DISPATCH_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { notification_id } = await req.json();
  if (!notification_id) {
    return NextResponse.json({ error: "Missing notification_id" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: notification } = await supabase
    .from("notifications")
    .select("id, recipient_id, type, message")
    .eq("id", notification_id)
    .single();

  if (!notification || !TITLES[notification.type]) {
    // Unknown/not-push-worthy type — nothing to do.
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", notification.recipient_id);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const { deadSubscriptionIds } = await sendPushToSubscriptions(subs, {
    title: TITLES[notification.type],
    body: notification.message,
    url: URLS[notification.type] ?? "/",
  });

  if (deadSubscriptionIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", deadSubscriptionIds);
  }

  return NextResponse.json({ ok: true, sent: subs.length - deadSubscriptionIds.length });
}

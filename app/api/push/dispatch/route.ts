import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToSubscriptions } from "@/lib/push";
import { notificationHref } from "@/lib/notificationLinks";

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
  receipt_export_due: "Monthly Fuel Receipts",
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
    .select("id, recipient_id, type, message, related_table, related_id, recipient:profiles!recipient_id(role)")
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
    url: pushUrl(notification),
  });

  if (deadSubscriptionIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", deadSubscriptionIds);
  }

  return NextResponse.json({ ok: true, sent: subs.length - deadSubscriptionIds.length });
}

// Admins go through /notifications/open/<id>, which marks the notification
// read and then opens the booking / check / vehicle it is about. Drivers
// can't read the notifications table (RLS), so they go straight there.
function pushUrl(n: {
  id: string;
  type: string;
  related_table: string | null;
  related_id: string | null;
  recipient: unknown;
}): string {
  const r = Array.isArray(n.recipient) ? n.recipient[0] : n.recipient;
  const role = (r as { role?: string } | null)?.role === "admin" ? "admin" : "driver";
  return role === "admin" ? `/notifications/open/${n.id}` : notificationHref(n, "driver");
}

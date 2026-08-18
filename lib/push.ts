import webpush from "web-push";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

export type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

/**
 * Sends one push message to every subscribed device for a set of
 * subscription rows. Returns the ids of subscriptions that are dead
 * (410 Gone / 404 Not Found) so the caller can delete them — browsers
 * routinely invalidate push subscriptions (uninstall, permission
 * revoked, browser data cleared) and there's no other way to find out
 * except a failed send.
 */
export async function sendPushToSubscriptions(
  subs: PushSubscriptionRow[],
  payload: { title: string; body: string; url?: string }
): Promise<{ deadSubscriptionIds: string[] }> {
  ensureConfigured();

  const deadSubscriptionIds: string[] = [];
  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        );
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          deadSubscriptionIds.push(sub.id);
        }
        // Other errors (network blips, rate limiting) are left alone —
        // not a reason to drop a subscription that might work next time.
      }
    })
  );

  return { deadSubscriptionIds };
}

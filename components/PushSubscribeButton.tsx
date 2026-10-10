"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type Status = "checking" | "unsupported" | "off" | "on" | "denied" | "working";

/**
 * The registered service worker, once it's actually running. register()
 * resolves before the worker is active, and pushManager.subscribe() on a
 * not-yet-active worker throws ("no active Service Worker"), which is why
 * Turn on used to ask for permission and then silently flip back to off.
 */
async function readyRegistration(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
}

function sameKey(sub: PushSubscription, key: Uint8Array): boolean {
  const current = sub.options?.applicationServerKey;
  if (!current) return true; // browser doesn't say; assume it matches
  const a = new Uint8Array(current);
  return a.length === key.length && a.every((b, i) => b === key[i]);
}

export default function PushSubscribeButton() {
  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      try {
        const reg = await readyRegistration();
        const existing = await reg.pushManager.getSubscription();
        // "On" only if this device is subscribed AND permission is still granted.
        setStatus(existing && Notification.permission === "granted" ? "on" : "off");
      } catch {
        setStatus("off");
      }
    })();
  }, []);

  async function subscribe() {
    setStatus("working");
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const key = urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!);
      const reg = await readyRegistration();

      // A subscription made earlier with a different key can't be reused.
      let sub = await reg.pushManager.getSubscription();
      if (sub && !sameKey(sub, key)) {
        await sub.unsubscribe();
        sub = null;
      }
      if (!sub) {
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      if (!res.ok) throw new Error(`save failed (${res.status})`);
      setStatus("on");
      setMessage("Notifications are on for this device.");
    } catch (err) {
      console.error("Push subscribe failed", err);
      setStatus("off");
      setMessage(
        "Couldn't turn notifications on. On iPhone, add Fleet Tracker to your Home Screen and open it from there first, then try again."
      );
    }
  }

  async function unsubscribe() {
    setStatus("working");
    setMessage(null);
    try {
      const reg = await readyRegistration();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("off");
      setMessage("Notifications are off for this device.");
    } catch {
      setStatus("on");
      setMessage("Couldn't turn notifications off. Please try again.");
    }
  }

  if (status === "checking") return null;

  if (status === "unsupported") {
    return <p className="text-xs text-steel">Push notifications aren't supported on this browser/device.</p>;
  }

  if (status === "denied") {
    return (
      <p className="text-xs text-steel">
        Notifications are blocked for this site in your browser settings. Enable them there to turn this on.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-steel/20 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">Push Notifications</p>
          <p className="text-xs text-steel">
            {status === "on" ? "On for this device." : "Get alerts even when the app is closed."}
          </p>
        </div>
        {status === "on" ? (
          <button
            onClick={unsubscribe}
            className="flex-shrink-0 rounded-lg border border-ink px-3 py-1.5 text-xs font-semibold text-ink"
          >
            Turn off
          </button>
        ) : (
          <button
            onClick={subscribe}
            disabled={status === "working"}
            className="flex-shrink-0 rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-paper disabled:opacity-50"
          >
            {status === "working" ? "…" : "Turn on"}
          </button>
        )}
      </div>
      {message && (
        <p role="status" className={`mt-2 text-xs ${status === "on" || message.includes("off for") ? "text-track" : "text-rust"}`}>
          {message}
        </p>
      )}
    </div>
  );
}

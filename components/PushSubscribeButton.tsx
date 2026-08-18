"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type Status = "checking" | "unsupported" | "off" | "on" | "denied" | "working";

export default function PushSubscribeButton() {
  const [status, setStatus] = useState<Status>("checking");

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
      const reg = await navigator.serviceWorker.register("/sw.js");
      const existing = await reg.pushManager.getSubscription();
      setStatus(existing ? "on" : "off");
    })();
  }, []);

  async function subscribe() {
    setStatus("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      setStatus("on");
    } catch {
      setStatus("off");
    }
  }

  async function unsubscribe() {
    setStatus("working");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
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
    } catch {
      setStatus("on");
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
          <button onClick={unsubscribe} className="flex-shrink-0 text-xs font-medium text-steel underline">
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
    </div>
  );
}

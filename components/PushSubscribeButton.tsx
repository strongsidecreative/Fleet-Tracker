"use client";

import { useEffect, useRef, useState } from "react";

function urlBase64ToUint8Array(raw: string) {
  // Trim stray spaces/quotes/newlines that can sneak in when the key is
  // pasted into hosting settings; atob() throws on them.
  const base64String = raw.trim().replace(/^["']|["']$/g, "");
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

// Fetched from the server at run time (see lib/vapid.ts for why).
async function fetchKey(): Promise<string | null> {
  const res = await fetch("/api/push/key", { cache: "no-store" });
  if (!res.ok) return null;
  const body = (await res.json().catch(() => null)) as { key?: string } | null;
  return body?.key ?? null;
}

function sameKey(sub: PushSubscription, key: Uint8Array): boolean {
  const current = sub.options?.applicationServerKey;
  if (!current) return true; // browser doesn't say; assume it matches
  const a = new Uint8Array(current);
  return a.length === key.length && a.every((b, i) => b === key[i]);
}

// Plain-English reason for a failed Turn on, plus the browser's own error
// name so a screenshot tells us exactly what went wrong.
function explain(err: unknown): string {
  const e = err as { name?: string; message?: string };
  const name = e?.name ?? "Error";
  const detail = `${name}${e?.message ? `: ${e.message}` : ""}`.slice(0, 160);
  if (name === "NotAllowedError") {
    return `Your phone didn't allow notifications for Fleet Tracker. Check Settings > Notifications > Fleet Tracker, then try again. (${detail})`;
  }
  if (name === "InvalidCharacterError" || name === "InvalidAccessError") {
    return `The app's notification key looks wrong. Let your admin know. (${detail})`;
  }
  if (name === "AbortError") {
    return `Your phone couldn't reach Apple's notification service. Check your connection and try again. (${detail})`;
  }
  return `Couldn't turn notifications on. Please try again. (${detail})`;
}

export default function PushSubscribeButton() {
  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState<string | null>(null);
  // The service worker registration, fetched on load so that tapping Turn
  // on goes straight to the permission prompt and subscribe. iPhone only
  // allows these in direct response to a tap, and waiting for the service
  // worker in between can use that up.
  const regRef = useRef<ServiceWorkerRegistration | null>(null);
  const keyRef = useRef<string | null>(null);

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
        fetchKey().then((k) => (keyRef.current = k)).catch(() => {});
        const reg = await readyRegistration();
        regRef.current = reg;
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
      const rawKey = keyRef.current ?? (await fetchKey());
      if (!rawKey) throw Object.assign(new Error("Push key missing from this build"), { name: "ConfigError" });
      const key = urlBase64ToUint8Array(rawKey);
      const reg = regRef.current ?? (await readyRegistration());

      const permission =
        Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        if (permission !== "denied") setMessage("Notifications weren't allowed. Tap Turn on and choose Allow.");
        return;
      }

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
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw Object.assign(new Error(body?.error ?? `HTTP ${res.status}`), { name: "SaveError" });
      }
      setStatus("on");
      setMessage("Notifications are on for this device.");
    } catch (err) {
      console.error("Push subscribe failed", err);
      setStatus("off");
      setMessage(explain(err));
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

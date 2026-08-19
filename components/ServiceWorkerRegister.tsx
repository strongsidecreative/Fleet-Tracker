"use client";

import { useEffect } from "react";

// Registers the service worker on every page load, site-wide — not just on
// the Account page where the push "Turn on" button lives. Browsers use a
// registered service worker (plus the manifest) as one of the signals for
// "this is installable" (desktop/Android's install icon in the address
// bar, Android's install banner). Without this, that signal only appeared
// after someone had already visited Account once, which is backwards.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Not fatal — push notifications and installability just won't be
        // available this session. Nothing else in the app depends on it.
      });
    }
  }, []);

  return null;
}

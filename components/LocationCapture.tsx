"use client";

import { useEffect, useState } from "react";

type State = { status: "locating" | "ok" | "unavailable"; lat?: number; lng?: number; accuracy?: number; reason?: string };

/**
 * Grabs the phone's location as soon as the start/finish form appears and
 * puts it in hidden inputs (lat, lng, accuracy) for the server action.
 * Calls onSettled once it has a fix or has given up (permission refused,
 * no signal, 12 s timeout), so the submit button never waits forever. A
 * trip always saves; without a location it's just recorded as unknown.
 */
export default function LocationCapture({ onSettled }: { onSettled?: () => void }) {
  const [state, setState] = useState<State>({ status: "locating" });

  useEffect(() => {
    let done = false;
    const settle = (s: State) => {
      if (done) return;
      done = true;
      setState(s);
      onSettled?.();
    };
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      settle({ status: "unavailable", reason: "this device can't share its location" });
      return;
    }
    const timer = setTimeout(() => settle({ status: "unavailable", reason: "no GPS fix yet" }), 12000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        settle({ status: "ok", lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
      },
      (err) => {
        clearTimeout(timer);
        settle({
          status: "unavailable",
          reason: err.code === err.PERMISSION_DENIED ? "location permission is off for this site" : "location couldn't be found",
        });
      },
      { enableHighAccuracy: true, timeout: 11000, maximumAge: 60000 }
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="text-xs">
      {state.status === "ok" && (
        <>
          <input type="hidden" name="lat" value={state.lat} />
          <input type="hidden" name="lng" value={state.lng} />
          <input type="hidden" name="accuracy" value={Math.round(state.accuracy ?? 0)} />
          <p className="text-track">Location recorded (within about {Math.max(5, Math.round(state.accuracy ?? 0))} m).</p>
        </>
      )}
      {state.status === "locating" && <p className="text-steel">Getting your location…</p>}
      {state.status === "unavailable" && (
        <p className="text-amber">
          Location not recorded: {state.reason}. You can still continue; to record it, allow location for Fleet Tracker in
          your phone settings.
        </p>
      )}
    </div>
  );
}

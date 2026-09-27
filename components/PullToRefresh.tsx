"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTour } from "@/components/tour/TourContext";

/**
 * Pull down from the top of any screen to refresh it. Mainly for the
 * installed PWA on iPhone, where there's no browser reload button and no
 * native pull-to-refresh. Refreshes via router.refresh(), which re-runs
 * the page's server data fetching and keeps client state (no full
 * reload), and keeps the spinner visible until that refresh has actually
 * finished.
 *
 * Only starts when the page is scrolled right to the top and the drag is
 * mostly vertical, so it doesn't fight normal scrolling or the sideways
 * swipe on People rows. Disabled while the tour is running.
 */
const THRESHOLD = 70; // px of (damped) pull needed to trigger a refresh
const MAX_PULL = 110;
const MIN_SPIN_MS = 600; // so a very fast refresh still visibly registers

export default function PullToRefresh() {
  const router = useRouter();
  const { active: tourActive } = useTour();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const startY = useRef<number | null>(null);
  const startX = useRef(0);
  const tracking = useRef(false);
  const pullRef = useRef(0);
  const spinStartedAt = useRef(0);

  // Hide the spinner once the refresh transition has finished (and it's
  // been visible for at least MIN_SPIN_MS).
  useEffect(() => {
    if (!refreshing || isPending) return;
    const remaining = Math.max(0, MIN_SPIN_MS - (Date.now() - spinStartedAt.current));
    const t = setTimeout(() => {
      setRefreshing(false);
      setPull(0);
      pullRef.current = 0;
    }, remaining);
    return () => clearTimeout(t);
  }, [refreshing, isPending]);

  useEffect(() => {
    if (tourActive) return;

    const onStart = (e: TouchEvent) => {
      if (refreshing || e.touches.length !== 1) return;
      if (window.scrollY > 0) return;
      startY.current = e.touches[0].clientY;
      startX.current = e.touches[0].clientX;
      tracking.current = false;
    };

    const onMove = (e: TouchEvent) => {
      if (startY.current === null || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      const dx = e.touches[0].clientX - startX.current;
      if (!tracking.current) {
        // Decide once whether this gesture is a pull-down.
        if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;
        if (dy <= 0 || Math.abs(dx) > dy || window.scrollY > 0) {
          startY.current = null;
          return;
        }
        tracking.current = true;
      }
      // Damped so it feels like resistance, capped at MAX_PULL.
      const distance = Math.min(MAX_PULL, Math.max(0, dy * 0.5));
      pullRef.current = distance;
      setPull(distance);
      if (e.cancelable) e.preventDefault(); // stop the page bouncing underneath
    };

    const onEnd = () => {
      if (startY.current === null) return;
      startY.current = null;
      if (!tracking.current) return;
      tracking.current = false;
      if (pullRef.current >= THRESHOLD) {
        spinStartedAt.current = Date.now();
        setRefreshing(true);
        setPull(THRESHOLD);
        startTransition(() => router.refresh());
      } else {
        setPull(0);
        pullRef.current = 0;
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [tourActive, refreshing, router]);

  if (pull === 0 && !refreshing) return null;

  const progress = Math.min(1, pull / THRESHOLD);
  const armed = progress >= 1;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[999] flex justify-center"
      style={{
        transform: `translateY(${pull - 44}px)`,
        transition: tracking.current ? "none" : "transform 200ms ease-out",
      }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-paper shadow-lg">
        {refreshing ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-paper/30 border-t-paper" aria-hidden />
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            style={{ transform: `rotate(${armed ? 180 : progress * 180}deg)`, transition: "transform 120ms" }}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        )}
        <span>{refreshing ? "Refreshing…" : armed ? "Release to refresh" : "Pull to refresh"}</span>
      </div>
    </div>
  );
}

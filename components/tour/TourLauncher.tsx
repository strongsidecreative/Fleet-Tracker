"use client";

import { useEffect, useState } from "react";
import { useTour } from "./TourContext";
import type { TourStep } from "./tourSteps";

/**
 * Mount once inside a role's layout. Automatically launches the tour the
 * first time a given user lands on this layout, then never again unless
 * they explicitly replay it (see RestartTourButton below).
 *
 * userId is passed down from the server layout (which already has it from
 * its own auth check) rather than re-fetched here with a client-side
 * supabase.auth.getUser() call — that extra call ran on literally every
 * page navigation (it's mounted in the root layout) and was failing with
 * a CORS error in production (the browser client sends it with
 * credentials: include, which Supabase's auth endpoint's wildcard
 * Access-Control-Allow-Origin can never satisfy). Dropping it removes a
 * redundant network round trip on every page load, not just the console
 * noise.
 */
export default function TourLauncher({
  steps,
  storageKeyPrefix,
  userId,
}: {
  steps: TourStep[];
  storageKeyPrefix: string;
  userId: string;
}) {
  const { start, active } = useTour();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (checked || active) return;

    const storageKey = `${storageKeyPrefix}_${userId}`;
    let seen: string | null = null;
    try {
      seen = window.localStorage.getItem(storageKey);
    } catch {
      // Storage unavailable — treat as unseen but don't crash.
    }

    setChecked(true);
    if (seen) return;

    // Start the tour the moment the page's real content is on screen, not
    // on a fixed timer. The layout (and this launcher) renders instantly
    // while the page itself is still streaming in behind loading.tsx's
    // skeleton, so the old fixed 600ms delay regularly opened the welcome
    // card over grey placeholders on a first, cold load (reported
    // 2026-09-27 after a new driver's first sign-in). Now: wait until the
    // loading skeleton is gone AND, if the tour has a step on this page,
    // that step's target exists — then start on the next painted frame.
    // A hard cap means a slow page can never block the tour entirely.
    const pagePath = window.location.pathname;
    const firstTargetHere = steps.find((st) => st.target && st.path === pagePath)?.target;
    const selectors = firstTargetHere ? (Array.isArray(firstTargetHere) ? firstTargetHere : [firstTargetHere]) : [];

    const contentReady = () => {
      if (document.querySelector("[data-page-loading]")) return false;
      if (selectors.length === 0) return true;
      return selectors.some((sel) => document.querySelector(sel));
    };

    let done = false;
    let raf = 0;
    const launch = () => {
      if (done) return;
      done = true;
      observer.disconnect();
      clearTimeout(cap);
      // Two frames: let the browser actually paint the content first, so
      // the app and the tour appear together rather than tour-first.
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => start(steps, storageKey));
      });
    };

    const observer = new MutationObserver(() => {
      if (contentReady()) launch();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const cap = setTimeout(launch, 8000);
    if (contentReady()) launch();

    return () => {
      done = true;
      observer.disconnect();
      clearTimeout(cap);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return null;
}

/**
 * Drop this into an Account page to let people replay the tour on demand.
 * userId is passed down from the server page, same reasoning as above.
 */
export function RestartTourButton({
  steps,
  storageKeyPrefix,
  userId,
  className,
}: {
  steps: TourStep[];
  storageKeyPrefix: string;
  userId: string;
  className?: string;
}) {
  const { start } = useTour();

  const handleClick = () => {
    const storageKey = `${storageKeyPrefix}_${userId}`;
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Ignore — the tour will still start for this session even if we
      // can't clear the stored flag.
    }
    start(steps, storageKey);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      data-tour="restart-tour"
      className={
        className ??
        "flex items-center justify-center rounded-xl border border-brand/40 bg-brand/10 px-4 py-2.5 text-sm font-semibold text-brand"
      }
    >
      Replay Tour
    </button>
  );
}

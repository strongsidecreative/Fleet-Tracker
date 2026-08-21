"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTour } from "./TourContext";
import type { TourStep } from "./tourSteps";

/**
 * Mount once inside a role's layout. Automatically launches the tour the
 * first time a given user lands on this layout, then never again unless
 * they explicitly replay it (see RestartTourButton below).
 */
export default function TourLauncher({
  steps,
  storageKeyPrefix,
}: {
  steps: TourStep[];
  storageKeyPrefix: string;
}) {
  const { start, active } = useTour();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (checked || active) return;
    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;

      const storageKey = `${storageKeyPrefix}_${user.id}`;
      let seen: string | null = null;
      try {
        seen = window.localStorage.getItem(storageKey);
      } catch {
        // Storage unavailable — treat as unseen but don't crash.
      }

      setChecked(true);
      if (!seen) {
        // Small delay so the dashboard has finished its first paint before
        // the spotlight tries to measure anything.
        setTimeout(() => {
          if (!cancelled) start(steps, storageKey);
        }, 600);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

/**
 * Drop this into an Account page to let people replay the tour on demand.
 */
export function RestartTourButton({
  steps,
  storageKeyPrefix,
  className,
}: {
  steps: TourStep[];
  storageKeyPrefix: string;
  className?: string;
}) {
  const { start } = useTour();

  const handleClick = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const storageKey = `${storageKeyPrefix}_${user.id}`;
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

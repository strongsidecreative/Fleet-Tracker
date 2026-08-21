"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import TourOverlay from "./TourOverlay";
import type { TourStep } from "./tourSteps";

type TourState = {
  active: boolean;
  steps: TourStep[];
  index: number;
  storageKey: string;
};

const EXIT_MESSAGE_MS = 5000;

type TourContextValue = {
  /** Start a tour. storageKey is where "completed"/"skipped" gets recorded. */
  start: (steps: TourStep[], storageKey: string) => void;
  /** Whether a tour is currently running. */
  active: boolean;
};

const TourContext = createContext<TourContextValue | null>(null);

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within a TourProvider");
  return ctx;
}

const EMPTY_STATE: TourState = { active: false, steps: [], index: 0, storageKey: "" };

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TourState>(EMPTY_STATE);
  const [exitMessage, setExitMessage] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const showExitMessage = useCallback((message: string) => {
    setExitMessage(message);
    setTimeout(() => setExitMessage((m) => (m === message ? null : m)), EXIT_MESSAGE_MS);
  }, []);

  const recordResult = useCallback((storageKey: string, result: "completed" | "skipped") => {
    try {
      window.localStorage.setItem(storageKey, result);
    } catch {
      // Private browsing / storage disabled — the tour just won't remember
      // it's been seen, which is a harmless degradation.
    }
  }, []);

  const start = useCallback((steps: TourStep[], storageKey: string) => {
    setState({ active: true, steps, index: 0, storageKey });
  }, []);

  const goToIndex = useCallback(
    (nextIndex: number) => {
      setState((s) => {
        if (!s.active) return s;
        if (nextIndex < 0) return s;
        if (nextIndex >= s.steps.length) {
          recordResult(s.storageKey, "completed");
          showExitMessage("Tour finished. You can replay it anytime from Account → Replay Tour.");
          return EMPTY_STATE;
        }
        const step = s.steps[nextIndex];
        if (step.path && step.path !== pathname) {
          router.push(step.path);
        }
        return { ...s, index: nextIndex };
      });
    },
    [pathname, router, recordResult, showExitMessage]
  );

  const next = useCallback(() => goToIndex(state.index + 1), [goToIndex, state.index]);
  const back = useCallback(() => goToIndex(state.index - 1), [goToIndex, state.index]);
  const skip = useCallback(() => {
    recordResult(state.storageKey, "skipped");
    setState(EMPTY_STATE);
    showExitMessage("Tour skipped. You can start it again anytime from Account → Replay Tour.");
  }, [recordResult, state.storageKey, showExitMessage]);

  const value = useMemo(() => ({ start, active: state.active }), [start, state.active]);

  const currentStep = state.steps[state.index];

  return (
    <TourContext.Provider value={value}>
      {children}
      {state.active && currentStep && (
        <TourOverlay
          key={currentStep.id}
          step={currentStep}
          stepNumber={state.index + 1}
          totalSteps={state.steps.length}
          isFirst={state.index === 0}
          isLast={state.index === state.steps.length - 1}
          onNext={next}
          onBack={back}
          onSkip={skip}
        />
      )}
      {exitMessage && !state.active && (
        <div className="fixed inset-x-4 bottom-24 z-[998] mx-auto max-w-sm rounded-xl bg-ink px-4 py-3 text-sm font-medium text-paper shadow-xl md:bottom-6">
          <div className="flex items-start justify-between gap-3">
            <span>{exitMessage}</span>
            <button
              onClick={() => setExitMessage(null)}
              aria-label="Dismiss"
              className="shrink-0 text-paper/60 hover:text-paper"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </TourContext.Provider>
  );
}

"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { TourStep } from "./tourSteps";

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 8;
const POPOVER_WIDTH = 320;
const POPOVER_GAP = 14;

export default function TourOverlay({
  step,
  stepNumber,
  totalSteps,
  isFirst,
  isLast,
  onNext,
  onBack,
  onSkip,
}: {
  step: TourStep;
  stepNumber: number;
  totalSteps: number;
  isFirst: boolean;
  isLast: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const [rect, setRect] = useState<Rect | null>(null);
  const [ready, setReady] = useState(!step.target);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Poll for the target element — it may not exist yet immediately after a
  // client-side route change, since the new page has to render first.
  useEffect(() => {
    if (!step.target) {
      setReady(true);
      setRect(null);
      return;
    }

    setReady(false);
    let cancelled = false;
    let attempts = 0;

    const tryFind = () => {
      if (cancelled) return;
      const el = document.querySelector(step.target!);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
        setReady(true);
        return;
      }
      attempts += 1;
      if (attempts < 40) {
        setTimeout(tryFind, 75);
      } else {
        // Couldn't find it — fall back to a centered card rather than
        // leaving the user stuck with no popover at all.
        setReady(true);
      }
    };

    tryFind();
    return () => {
      cancelled = true;
    };
  }, [step.target]);

  useLayoutEffect(() => {
    if (!ready || !step.target) return;

    const update = () => {
      const el = document.querySelector(step.target!);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const interval = setInterval(update, 200);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      clearInterval(interval);
    };
  }, [ready, step.target]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft" && !isFirst) onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip, onNext, onBack, isFirst]);

  if (!ready) {
    // Waiting for a navigation-triggered target to mount. Show a minimal
    // centered loading card so there's no dead frame with just a backdrop.
    return (
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-ink/60">
        <div className="rounded-2xl bg-white px-5 py-4 text-sm font-medium text-ink shadow-xl">Loading…</div>
      </div>
    );
  }

  const popoverStyle = rect ? computePopoverStyle(rect, step.placement) : undefined;

  return (
    <div className="fixed inset-0 z-[999]" role="dialog" aria-modal="true" aria-label="Product tour">
      {/* Backdrop with a spotlight cut-out over the target element. */}
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-xl ring-2 ring-brandLight transition-all duration-200"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: "0 0 0 2000px rgba(7,14,31,0.68)",
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-ink/68" />
      )}
      {/* Click-catcher so the rest of the app is inert during the tour. */}
      <div className="fixed inset-0" onClick={(e) => e.stopPropagation()} />

      <div
        ref={popoverRef}
        className="fixed z-[1000] w-[min(90vw,320px)] rounded-2xl bg-white p-4 shadow-2xl"
        style={popoverStyle ?? { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wide text-brand">
            Step {stepNumber} of {totalSteps}
          </span>
          <button
            onClick={onSkip}
            className="text-xs font-medium text-steel underline underline-offset-2 hover:text-ink"
          >
            Skip tour
          </button>
        </div>
        <h2 className="mb-1 font-display text-base font-bold text-ink">{step.title}</h2>
        <p className="mb-4 text-sm leading-relaxed text-steel">{step.content}</p>
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onBack}
            disabled={isFirst}
            className="rounded-xl border border-steel/30 px-4 py-2 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-30"
          >
            Back
          </button>
          <button
            onClick={onNext}
            className="rounded-xl bg-ink px-5 py-2 text-sm font-semibold text-paper"
          >
            {isLast ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

function computePopoverStyle(rect: Rect, placement: TourStep["placement"]): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const preferred = placement && placement !== "auto" ? placement : pickAutoPlacement(rect, vw, vh);

  let top: number;
  let left: number;

  switch (preferred) {
    case "top":
      top = rect.top - POPOVER_GAP;
      left = rect.left + rect.width / 2;
      break;
    case "left":
      top = rect.top + rect.height / 2;
      left = rect.left - POPOVER_GAP;
      break;
    case "right":
      top = rect.top + rect.height / 2;
      left = rect.left + rect.width + POPOVER_GAP;
      break;
    case "bottom":
    default:
      top = rect.top + rect.height + POPOVER_GAP;
      left = rect.left + rect.width / 2;
      break;
  }

  const style: React.CSSProperties = {};

  if (preferred === "top") {
    style.top = Math.max(12, top);
    style.left = clamp(left, POPOVER_WIDTH / 2 + 12, vw - POPOVER_WIDTH / 2 - 12);
    style.transform = "translate(-50%, -100%)";
  } else if (preferred === "bottom") {
    style.top = Math.min(vh - 12, top);
    style.left = clamp(left, POPOVER_WIDTH / 2 + 12, vw - POPOVER_WIDTH / 2 - 12);
    style.transform = "translate(-50%, 0)";
  } else if (preferred === "left") {
    style.top = clamp(top, 12, vh - 12);
    style.left = Math.max(12, left);
    style.transform = "translate(-100%, -50%)";
  } else {
    style.top = clamp(top, 12, vh - 12);
    style.left = Math.min(vw - 12, left);
    style.transform = "translate(0, -50%)";
  }

  return style;
}

function pickAutoPlacement(rect: Rect, vw: number, vh: number): "top" | "bottom" | "left" | "right" {
  const spaceBelow = vh - (rect.top + rect.height);
  const spaceAbove = rect.top;
  const spaceRight = vw - (rect.left + rect.width);
  const spaceLeft = rect.left;
  const max = Math.max(spaceBelow, spaceAbove, spaceRight, spaceLeft);
  if (max === spaceBelow) return "bottom";
  if (max === spaceAbove) return "top";
  if (max === spaceRight) return "right";
  return "left";
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

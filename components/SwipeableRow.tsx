"use client";

import { useEffect, useRef, useState } from "react";

/**
 * iOS-Mail-style swipe-to-reveal actions. `children` is the row's normal
 * content (unchanged); `actions` are rendered off-screen to the right and
 * revealed by dragging the content left. Dragging past halfway snaps fully
 * open; releasing before that snaps back closed. Tapping/clicking the row
 * while open closes it instead of triggering whatever's underneath (the
 * Link to the driver's detail page) — same as the pattern this mirrors.
 *
 * Built on Pointer Events (not touch-only) so this also works with a
 * mouse — this admin page is used from a laptop as often as a phone, and
 * a swipe-only gesture would leave desktop admins with no way to reach
 * these actions at all.
 *
 * Actions are measured (not given a fixed width) so this works for any
 * number of buttons of any label length — pass real form/button markup,
 * same as would've gone inline before.
 */
export default function SwipeableRow({
  children,
  actions,
}: {
  children: React.ReactNode;
  actions: React.ReactNode;
}) {
  const actionsRef = useRef<HTMLDivElement>(null);
  const [openWidth, setOpenWidth] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const dragStartX = useRef<number | null>(null);
  const dragStartTranslate = useRef(0);
  const isDragging = useRef(false);
  const draggedPastThreshold = useRef(false);

  // Re-measure whenever the actions themselves change (e.g. a row flips
  // from active to inactive after a server action, swapping Deactivate
  // for Remove) — not just on first mount.
  useEffect(() => {
    if (actionsRef.current) {
      setOpenWidth(actionsRef.current.scrollWidth);
    }
  }, [actions]);

  const clamp = (value: number) => Math.min(0, Math.max(-openWidth, value));

  const handlePointerDown = (e: React.PointerEvent) => {
    // Right-click / non-primary buttons shouldn't start a drag.
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragStartX.current = e.clientX;
    dragStartTranslate.current = translateX;
    isDragging.current = true;
    draggedPastThreshold.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || dragStartX.current === null) return;
    const delta = e.clientX - dragStartX.current;
    if (Math.abs(delta) > 4) draggedPastThreshold.current = true;
    setTranslateX(clamp(dragStartTranslate.current + delta));
  };

  const endDrag = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setTranslateX((current) => (current < -openWidth / 2 ? -openWidth : 0));
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div ref={actionsRef} className="absolute inset-y-0 right-0 flex items-stretch">
        {actions}
      </div>
      <div
        className="relative select-none transition-transform duration-150 ease-out"
        style={{ transform: `translateX(${translateX}px)`, touchAction: "pan-y" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={(e) => {
          // A real drag shouldn't also fire a click on release. And a tap
          // while already open just closes the drawer, same as iOS —
          // stop it from also activating whatever's underneath (the Link).
          if (draggedPastThreshold.current || translateX !== 0) {
            e.preventDefault();
            e.stopPropagation();
            if (translateX !== 0) setTranslateX(0);
            draggedPastThreshold.current = false;
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}

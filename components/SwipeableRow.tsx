"use client";

import { useEffect, useRef, useState } from "react";

// How much of the actions strip stays peeking out at rest, so a row with
// actions visibly looks swipeable instead of identical to one without —
// the previous version looked exactly like a plain static row until you
// happened to try dragging it.
const PEEK_PX = 14;

/**
 * iOS-Mail-style swipe-to-reveal actions. `children` is the row's normal
 * content (unchanged); `actions` are rendered off-screen to the right and
 * revealed by dragging the content left. At rest, a small sliver of the
 * actions strip (PEEK_PX) stays visible as a hint that the row swipes —
 * dragging past halfway from there snaps fully open; releasing earlier
 * snaps back to that same peek, never fully flush. Tapping/clicking the
 * row while fully open closes it instead of triggering whatever's
 * underneath (the Link to the driver's/vehicle's detail page) — same as
 * the pattern this mirrors. A row with no actions (actions has no
 * rendered width) behaves like a plain static row, no peek shown.
 *
 * Built on Pointer Events (not touch-only) so this also works with a
 * mouse — this admin page is used from a laptop as often as a phone, and
 * a swipe-only gesture would leave desktop admins with no way to reach
 * these actions at all.
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

  const restOffset = openWidth > 0 ? -PEEK_PX : 0;

  // Re-measure whenever the actions themselves change (e.g. a row flips
  // from active to inactive after a server action, swapping Deactivate
  // for Remove) — not just on first mount. Snaps back to the (possibly
  // new) rest position whenever that happens, so a row that just lost
  // its actions doesn't stay stuck peeking at nothing.
  useEffect(() => {
    const width = actionsRef.current?.scrollWidth ?? 0;
    setOpenWidth(width);
    setTranslateX(width > 0 ? -PEEK_PX : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setTranslateX((current) => (current < -openWidth / 2 ? -openWidth : restOffset));
  };

  const isFullyOpen = translateX <= -openWidth / 2 && openWidth > 0;

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
          // while fully open just closes the drawer, same as iOS — stop
          // it from also activating whatever's underneath (the Link). The
          // resting peek is small enough that a tap there should still
          // navigate normally, not be swallowed by this.
          if (draggedPastThreshold.current || isFullyOpen) {
            e.preventDefault();
            e.stopPropagation();
            if (isFullyOpen) setTranslateX(restOffset);
            draggedPastThreshold.current = false;
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}

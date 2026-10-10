"use client";

import { useEffect, useState } from "react";

// Opens a photo full screen inside the app instead of a new tab. In the
// installed app (Home Screen) a new tab has no back button, so the user
// got stuck on the photo. Close with the button, the backdrop, or Escape.
export default function PhotoViewer({
  src,
  label = "View Receipt",
  alt = "Receipt photo",
  className = "font-medium text-brand underline",
}: {
  src: string;
  label?: string;
  alt?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[100] flex flex-col bg-black/90"
          style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex justify-end p-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-ink"
            >
              Close
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-auto p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              onClick={(e) => e.stopPropagation()}
              className="max-h-full max-w-full rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}

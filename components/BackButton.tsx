"use client";

import { useRouter } from "next/navigation";

// Plain router.back() rather than a fixed href — every place this is used
// (currently just the QR scanner) is always reached by navigating forward
// from somewhere in the app, so there's always a previous entry to return
// to, and this naturally goes back to wherever the driver actually came
// from (dashboard "Scan to Finish", the admin "Scan Vehicle" tab, etc.)
// instead of a single hardcoded destination.
export default function BackButton({ label = "Back" }: { label?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="flex items-center gap-1 text-sm font-medium text-steel"
    >
      <span aria-hidden="true">←</span> {label}
    </button>
  );
}

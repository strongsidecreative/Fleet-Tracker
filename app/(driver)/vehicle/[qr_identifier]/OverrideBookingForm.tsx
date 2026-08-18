"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { overrideBooking } from "./overrideActions";

export default function OverrideBookingForm({ bookingId, vehicleName }: { bookingId: string; vehicleName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="w-full rounded-lg border border-rust/40 py-2 text-sm font-semibold text-rust"
      >
        Override Booking
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional)"
        className="w-full rounded-lg border border-steel/30 px-3 py-2 text-sm"
      />
      <button
        disabled={pending}
        onClick={async () => {
          setPending(true);
          await overrideBooking(bookingId, reason);
          router.refresh();
        }}
        className="w-full rounded-lg bg-rust py-2 text-sm font-semibold text-paper disabled:opacity-50"
      >
        {pending ? "Overriding…" : `Confirm Override — ${vehicleName}`}
      </button>
    </div>
  );
}

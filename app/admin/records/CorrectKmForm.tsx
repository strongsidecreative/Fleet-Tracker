"use client";

import { useFormState, useFormStatus } from "react-dom";
import { correctTripKm } from "./actions";

function Save() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-paper disabled:opacity-60">
      {pending ? "Saving…" : "Save KM"}
    </button>
  );
}

/** Admin-only "Correct KM" for one trip, tucked in a disclosure so the table stays tidy. */
export default function CorrectKmForm({
  tripId,
  startKm,
  endKm,
  active,
}: {
  tripId: string;
  startKm: number;
  endKm: number | null;
  active: boolean;
}) {
  const [state, formAction] = useFormState(correctTripKm.bind(null, tripId), { error: null, ok: null });

  return (
    <details className="mt-1 text-xs">
      <summary className="cursor-pointer font-medium text-brand underline">Correct KM</summary>
      <form action={formAction} className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-steel/20 bg-paper p-2 sm:grid-cols-4">
        <label className="flex flex-col gap-0.5">
          <span className="text-steel">Start KM</span>
          <input name="start_km" inputMode="numeric" defaultValue={startKm} required className="rounded border border-steel/30 px-2 py-1.5" />
        </label>
        {!active && (
          <label className="flex flex-col gap-0.5">
            <span className="text-steel">End KM</span>
            <input name="end_km" inputMode="numeric" defaultValue={endKm ?? ""} required className="rounded border border-steel/30 px-2 py-1.5" />
          </label>
        )}
        <label className="col-span-2 flex flex-col gap-0.5">
          <span className="text-steel">Reason (optional)</span>
          <input name="reason" maxLength={200} placeholder="e.g. extra digit typed" className="rounded border border-steel/30 px-2 py-1.5" />
        </label>
        <div className="col-span-2 flex items-center gap-2 sm:col-span-4">
          <Save />
          {state.error && <p className="font-medium text-rust">{state.error}</p>}
          {state.ok && <p className="font-medium text-track">{state.ok}</p>}
        </div>
        <p className="col-span-2 text-steel sm:col-span-4">
          The vehicle&apos;s odometer is reset from its most recent trip, and the change is recorded in the Audit Log.
        </p>
      </form>
    </details>
  );
}

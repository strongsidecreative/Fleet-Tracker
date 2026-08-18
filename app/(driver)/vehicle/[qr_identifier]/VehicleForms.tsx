"use client";

import { useFormState, useFormStatus } from "react-dom";
import { startTrip, finishTrip } from "./actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-ink py-3 text-base font-semibold text-paper disabled:opacity-60"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

export function StartTripForm({ vehicleId, defaultKm }: { vehicleId: string; defaultKm: number }) {
  const boundAction = startTrip.bind(null, vehicleId);
  const [state, formAction] = useFormState(boundAction, { error: null });

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="km" className="mb-1 block text-sm font-medium text-ink">
          Enter Current KM
        </label>
        <input
          id="km"
          name="km"
          inputMode="numeric"
          placeholder={`e.g. ${defaultKm + 2}`}
          required
          className="w-full rounded-lg border border-steel/30 bg-white px-4 py-3 text-lg focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm font-medium text-rust">
          {state.error}
        </p>
      )}
      <SubmitButton label="Start Vehicle Use" />
    </form>
  );
}

export function FinishTripForm({ tripId, startKm }: { tripId: string; startKm: number }) {
  const boundAction = finishTrip.bind(null, tripId);
  const [state, formAction] = useFormState(boundAction, { error: null });

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="km" className="mb-1 block text-sm font-medium text-ink">
          Current / Ending KM
        </label>
        <input
          id="km"
          name="km"
          inputMode="numeric"
          placeholder={`e.g. ${startKm + 20}`}
          required
          className="w-full rounded-lg border border-steel/30 bg-white px-4 py-3 text-lg focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm font-medium text-rust">
          {state.error}
        </p>
      )}
      <SubmitButton label="Finish Vehicle Use" />
    </form>
  );
}

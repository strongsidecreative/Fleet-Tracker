"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { startTrip, finishTrip } from "./actions";
import LocationCapture from "@/components/LocationCapture";

function SubmitButton({ label, waiting }: { label: string; waiting: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || waiting}
      className="w-full rounded-xl bg-ink py-3 text-base font-semibold text-paper disabled:opacity-60"
    >
      {pending ? "Saving…" : waiting ? "Getting location…" : label}
    </button>
  );
}

export function StartTripForm({ vehicleId, defaultKm }: { vehicleId: string; defaultKm: number }) {
  const boundAction = startTrip.bind(null, vehicleId);
  const [state, formAction] = useFormState(boundAction, { error: null });
  const [locating, setLocating] = useState(true);
  const [typed, setTyped] = useState(false);

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
      <div>
        <label htmlFor="place" className="mb-1 block text-sm font-medium text-ink">
          Start Location <span className="font-normal text-steel">(optional)</span>
        </label>
        <input
          id="place"
          name="place"
          type="text"
          autoComplete="off"
          maxLength={120}
          placeholder="e.g. Whakatāne office, 12 King St"
          onChange={(e) => setTyped(e.target.value.trim() !== "")}
          className="w-full rounded-lg border border-steel/30 bg-white px-4 py-3 text-base focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <p className="mt-1 text-xs text-steel">Leave blank to use your phone&apos;s location.</p>
      </div>
      {state.error && (
        <p role="alert" className="text-sm font-medium text-rust">
          {state.error}
        </p>
      )}
      <LocationCapture onSettled={() => setLocating(false)} />
      <SubmitButton label="Start Vehicle Use" waiting={locating && !typed} />
    </form>
  );
}

export function FinishTripForm({ tripId, startKm }: { tripId: string; startKm: number }) {
  const boundAction = finishTrip.bind(null, tripId);
  const [state, formAction] = useFormState(boundAction, { error: null });
  const [locating, setLocating] = useState(true);
  const [typed, setTyped] = useState(false);

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
      <div>
        <label htmlFor="place" className="mb-1 block text-sm font-medium text-ink">
          Finish Location <span className="font-normal text-steel">(optional)</span>
        </label>
        <input
          id="place"
          name="place"
          type="text"
          autoComplete="off"
          maxLength={120}
          placeholder="e.g. Whakatāne office, 12 King St"
          onChange={(e) => setTyped(e.target.value.trim() !== "")}
          className="w-full rounded-lg border border-steel/30 bg-white px-4 py-3 text-base focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <p className="mt-1 text-xs text-steel">Leave blank to use your phone&apos;s location.</p>
      </div>
      {state.error && (
        <p role="alert" className="text-sm font-medium text-rust">
          {state.error}
        </p>
      )}
      <LocationCapture onSettled={() => setLocating(false)} />
      <SubmitButton label="Finish Vehicle Use" waiting={locating && !typed} />
    </form>
  );
}

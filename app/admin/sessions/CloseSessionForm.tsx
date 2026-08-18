"use client";

import { useFormState, useFormStatus } from "react-dom";
import { closeSession } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper disabled:opacity-60"
    >
      {pending ? "Saving…" : "Close Trip"}
    </button>
  );
}

export default function CloseSessionForm({ tripId }: { tripId: string }) {
  const boundAction = closeSession.bind(null, tripId);
  const [state, formAction] = useFormState(boundAction, { error: null });

  return (
    <form action={formAction} className="mt-2 flex items-start gap-2">
      <input
        name="km"
        inputMode="numeric"
        placeholder="Ending KM"
        required
        className="w-32 rounded-lg border border-steel/30 px-3 py-2 text-sm"
      />
      <SubmitButton />
      {state.error && <p className="text-xs font-medium text-rust">{state.error}</p>}
    </form>
  );
}

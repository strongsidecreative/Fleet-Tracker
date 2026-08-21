"use client";

import { useFormState, useFormStatus } from "react-dom";
import { renameOrganisation } from "./actions";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

export default function OrganisationCard({ organisationName }: { organisationName: string }) {
  const [state, formAction] = useFormState(renameOrganisation, { error: null });

  return (
    <div className="max-w-sm space-y-3 rounded-xl border border-steel/20 bg-white p-4">
      <p className="text-xs text-steel">Organisation</p>
      <form action={formAction} className="flex items-start gap-2">
        <input
          name="name"
          required
          defaultValue={organisationName}
          className="w-full rounded-lg border border-steel/30 px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <SaveButton />
      </form>
      {state.error && (
        <p role="alert" className="text-sm font-medium text-rust">
          {state.error}
        </p>
      )}
    </div>
  );
}

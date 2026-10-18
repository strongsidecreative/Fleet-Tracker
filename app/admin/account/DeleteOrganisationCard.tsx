"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { deleteOrganisation } from "./actions";

function DeleteButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="w-full rounded-xl bg-rust py-3 text-sm font-semibold text-paper disabled:opacity-50"
    >
      {pending ? "Deleting everything…" : "Permanently delete organisation"}
    </button>
  );
}

/**
 * Account page "danger zone": permanently deletes the whole organisation,
 * every account in it, and all its records and photos. Two steps (open,
 * then type the organisation name) so it can't happen by a stray tap.
 */
export default function DeleteOrganisationCard({ organisationName }: { organisationName: string }) {
  const [state, formAction] = useFormState(deleteOrganisation, { error: null });
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (state.redirectTo) window.location.replace(state.redirectTo);
  }, [state.redirectTo]);

  const matches = typed.trim().toLowerCase() === organisationName.trim().toLowerCase() && typed.trim() !== "";

  return (
    <div className="max-w-sm rounded-xl border border-rust/40 bg-white p-4">
      <p className="text-sm font-semibold text-rust">Delete organisation</p>
      <p className="mt-1 text-xs text-steel">
        Permanently removes {organisationName ? <strong>{organisationName}</strong> : "this organisation"} from Fleet
        Tracker: every admin and driver account, all vehicles, trips, bookings, checks, incidents, fuel logs, receipts,
        notifications and photos. Nobody in the organisation will be able to log in. This cannot be undone.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 w-full rounded-xl border border-rust/50 py-3 text-sm font-semibold text-rust"
        >
          Delete organisation…
        </button>
      ) : (
        <form action={formAction} className="mt-3 space-y-3">
          <p className="text-xs text-ink">
            Download anything you want to keep first (Vehicles, Records and Fuel all have CSV exports). To confirm, type
            the organisation name:
          </p>
          <input
            name="confirmName"
            autoComplete="off"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={organisationName}
            className="w-full rounded-lg border border-rust/40 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-rust"
          />
          {state.error && (
            <p role="alert" className="text-sm font-medium text-rust">
              {state.error}
            </p>
          )}
          <DeleteButton disabled={!matches} />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setTyped("");
            }}
            className="w-full rounded-xl border border-steel/30 py-3 text-sm font-semibold text-ink"
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}

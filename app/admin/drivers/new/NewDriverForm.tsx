"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createDrivers, type BulkActionState } from "./actions";

type Row = { id: string };

function makeRowId() {
  return Math.random().toString(36).slice(2, 10);
}

function SubmitButton({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-ink py-3 text-base font-semibold text-paper disabled:opacity-60"
    >
      {pending ? "Sending Invites…" : count > 1 ? `Add ${count} Drivers` : "Add Driver"}
    </button>
  );
}

const initialState: BulkActionState = { results: [], formError: null };

export default function NewDriverForm() {
  const [rows, setRows] = useState<Row[]>([{ id: makeRowId() }]);
  const [state, formAction] = useFormState(createDrivers, initialState);

  // On a partial success, drop the rows that already got invited so a
  // resubmit only retries the ones that actually need fixing.
  useEffect(() => {
    const succeededIds = new Set(state.results.filter((r) => r.error === null).map((r) => r.rowId));
    if (succeededIds.size === 0) return;
    setRows((prev) => {
      const remaining = prev.filter((row) => !succeededIds.has(row.id));
      return remaining.length > 0 ? remaining : [{ id: makeRowId() }];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.results]);

  function addRow() {
    setRows((r) => [...r, { id: makeRowId() }]);
  }

  function removeRow(id: string) {
    setRows((r) => (r.length > 1 ? r.filter((row) => row.id !== id) : r));
  }

  return (
    <form action={formAction} className="space-y-3">
      {rows.map((row, i) => {
        const rowResult = state.results.find((r) => r.rowId === row.id);
        return (
          <div key={row.id} className="space-y-4 rounded-xl border border-steel/20 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-steel">Driver {i + 1}</p>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="text-xs font-medium text-rust underline underline-offset-2"
                >
                  Remove
                </button>
              )}
            </div>
            <div>
              <label htmlFor={`name-${row.id}`} className="mb-1 block text-sm font-medium text-ink">
                Full Name
              </label>
              <input
                id={`name-${row.id}`}
                name={`driver-${row.id}-name`}
                required
                className="w-full rounded-lg border border-steel/30 px-4 py-3 text-base focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div>
              <label htmlFor={`email-${row.id}`} className="mb-1 block text-sm font-medium text-ink">
                Email
              </label>
              <input
                id={`email-${row.id}`}
                name={`driver-${row.id}-email`}
                type="email"
                required
                className="w-full rounded-lg border border-steel/30 px-4 py-3 text-base focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            {rowResult?.error && (
              <p role="alert" className="text-sm font-medium text-rust">
                {rowResult.error}
              </p>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={addRow}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-steel/40 py-3 text-sm font-semibold text-steel transition-colors hover:border-brand hover:text-brand"
      >
        <span aria-hidden="true" className="text-lg leading-none">
          +
        </span>
        Add Another Driver
      </button>

      <p className="text-xs text-steel">
        This sends an invite email through Supabase for each driver. They click the link and set their own password.
      </p>

      {state.formError && (
        <p role="alert" className="text-sm font-medium text-rust">
          {state.formError}
        </p>
      )}

      <SubmitButton count={rows.length} />
    </form>
  );
}

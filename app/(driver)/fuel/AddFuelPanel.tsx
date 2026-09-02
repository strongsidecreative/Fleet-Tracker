"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { logFuel } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex-1 rounded-xl bg-ink py-2.5 text-sm font-semibold text-paper disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

export default function AddFuelPanel({ vehicleId, tripId }: { vehicleId: string; tripId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(logFuel, { error: null });
  const [receiptName, setReceiptName] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      setReceiptName(null);
      formRef.current?.reset();
      setJustSaved(true);
      const t = setTimeout(() => setJustSaved(false), 4000);
      return () => clearTimeout(t);
    }
  }, [state.success]);

  if (justSaved && !open) {
    return <p className="mt-3 text-center text-xs font-semibold text-track">Fuel logged.</p>;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 block w-full rounded-xl border border-steel/30 bg-white py-2.5 text-center text-sm font-semibold text-ink"
      >
        Add Fuel
      </button>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="mt-3 space-y-3 rounded-xl border border-steel/20 bg-white p-3">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <input type="hidden" name="tripId" value={tripId} />

      <div>
        <label htmlFor="cost" className="mb-1 block text-sm font-medium text-ink">
          Amount Paid ($)
        </label>
        <input
          id="cost"
          name="cost"
          inputMode="decimal"
          placeholder="e.g. 105.30"
          required
          autoFocus
          className="w-full rounded-lg border border-steel/30 px-4 py-3 text-lg focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      <div>
        <label htmlFor="litres" className="mb-1 block text-sm font-medium text-ink">
          Litres <span className="font-normal text-steel">(optional)</span>
        </label>
        <input
          id="litres"
          name="litres"
          inputMode="decimal"
          placeholder="e.g. 42.50"
          className="w-full rounded-lg border border-steel/30 px-4 py-3 text-base focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      <div>
        <label className="mb-1 flex items-center gap-2 text-sm font-medium text-ink">
          <span className="rounded bg-ink px-2 py-1 text-xs text-paper">Photo of Receipt</span>
          {receiptName && <span className="text-xs text-track">{receiptName}</span>}
        </label>
        <input
          type="file"
          name="receipt"
          accept="image/*"
          capture="environment"
          onChange={(e) => setReceiptName(e.target.files?.[0]?.name ?? null)}
          className="w-full text-xs text-steel"
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm font-medium text-rust">
          {state.error}
        </p>
      )}

      <div className="flex gap-2">
        <SubmitButton />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl border border-steel/30 px-4 py-2.5 text-sm font-semibold text-steel"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

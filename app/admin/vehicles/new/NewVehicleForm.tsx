"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createVehicle } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-ink py-3 text-base font-semibold text-paper disabled:opacity-60"
    >
      {pending ? "Saving…" : "Add Vehicle"}
    </button>
  );
}

export default function NewVehicleForm() {
  const [state, formAction] = useFormState(createVehicle, { error: null });

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-steel/20 bg-white p-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-ink">
          Vehicle Name
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="e.g. Toyota Hilux"
          className="w-full rounded-lg border border-steel/30 px-4 py-3 text-base focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>
      <div>
        <label htmlFor="registration" className="mb-1 block text-sm font-medium text-ink">
          Registration
        </label>
        <input
          id="registration"
          name="registration"
          required
          className="w-full rounded-lg border border-steel/30 px-4 py-3 text-base focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="make" className="mb-1 block text-sm font-medium text-ink">
            Make
          </label>
          <input
            id="make"
            name="make"
            className="w-full rounded-lg border border-steel/30 px-3 py-3 text-base focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <div>
          <label htmlFor="model" className="mb-1 block text-sm font-medium text-ink">
            Model
          </label>
          <input
            id="model"
            name="model"
            className="w-full rounded-lg border border-steel/30 px-3 py-3 text-base focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
      </div>
      <div>
        <label htmlFor="odometer" className="mb-1 block text-sm font-medium text-ink">
          Starting Odometer (KM)
        </label>
        <input
          id="odometer"
          name="odometer"
          inputMode="numeric"
          required
          className="w-full rounded-lg border border-steel/30 px-4 py-3 text-base focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>
      <div>
        <label htmlFor="ruc" className="mb-1 block text-sm font-medium text-ink">
          RUC Purchased-To (KM) <span className="font-normal text-steel">— optional</span>
        </label>
        <input
          id="ruc"
          name="ruc"
          inputMode="numeric"
          placeholder="e.g. 90000"
          className="w-full rounded-lg border border-steel/30 px-4 py-3 text-base focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <p className="mt-1 text-xs text-steel">Road User Charges — the odometer reading your current RUC licence is paid up to.</p>
      </div>
      {state.error && (
        <p role="alert" className="text-sm font-medium text-rust">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}

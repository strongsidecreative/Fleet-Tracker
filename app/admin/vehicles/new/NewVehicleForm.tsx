"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { shrinkImageInput } from "@/lib/shrinkImage";
import { createVehicle } from "../actions";
import VehicleComplianceFields from "../VehicleComplianceFields";

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
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-steel/20 bg-white p-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-ink">
          Photo <span className="font-normal text-steel">(optional)</span>
        </label>
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Vehicle photo preview" className="mb-2 h-40 w-full rounded-lg object-cover" />
        )}
        <input
          type="file"
          name="photo"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            setPreview(file ? URL.createObjectURL(file) : null);
            void shrinkImageInput(e.currentTarget);
          }}
          className="w-full text-xs text-steel file:mr-3 file:rounded-lg file:border-0 file:bg-ink file:px-3 file:py-2 file:text-xs file:font-semibold file:text-paper"
        />
      </div>
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
      <p className="text-xs text-steel">
        Everything below is optional and can be filled in or changed later from the vehicle&apos;s Edit page.
        Filling it in now means WOF, rego, RUC, service and wheel alignment reminders start straight away.
      </p>

      <VehicleComplianceFields />

      {state.error && (
        <p role="alert" className="text-sm font-medium text-rust">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}

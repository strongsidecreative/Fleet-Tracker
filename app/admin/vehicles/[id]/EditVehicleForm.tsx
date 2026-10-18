"use client";

import { shrinkImageInput } from "@/lib/shrinkImage";
import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { updateVehicle } from "../actions";
import VehicleComplianceFields from "../VehicleComplianceFields";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-ink py-3 text-base font-semibold text-paper disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

export default function EditVehicleForm({ vehicle }: { vehicle: any }) {
  const boundAction = updateVehicle.bind(null, vehicle.id);
  const [state, formAction] = useFormState(boundAction, { error: null });
  const [preview, setPreview] = useState<string | null>(vehicle.photo_url ?? null);

  return (
    <form action={formAction} className="space-y-5 rounded-xl border border-steel/20 bg-white p-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-steel">Photo</label>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={vehicle.name} className="mb-2 h-40 w-full rounded-lg object-cover" />
        ) : (
          <div className="mb-2 flex h-40 w-full items-center justify-center rounded-lg bg-paper text-xs text-steel">
            No photo yet
          </div>
        )}
        <input
          type="file"
          name="photo"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setPreview(URL.createObjectURL(file));
            void shrinkImageInput(e.currentTarget);
          }}
          className="w-full text-xs text-steel file:mr-3 file:rounded-lg file:border-0 file:bg-ink file:px-3 file:py-2 file:text-xs file:font-semibold file:text-paper"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="name" className="mb-1 block text-xs font-medium text-steel">
            Name
          </label>
          <input
            id="name"
            name="name"
            defaultValue={vehicle.name}
            required
            className="w-full rounded-lg border border-steel/30 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="registration" className="mb-1 block text-xs font-medium text-steel">
            Registration
          </label>
          <input
            id="registration"
            name="registration"
            defaultValue={vehicle.registration}
            required
            className="w-full rounded-lg border border-steel/30 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="make" className="mb-1 block text-xs font-medium text-steel">
            Make
          </label>
          <input
            id="make"
            name="make"
            defaultValue={vehicle.make ?? ""}
            className="w-full rounded-lg border border-steel/30 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="model" className="mb-1 block text-xs font-medium text-steel">
            Model
          </label>
          <input
            id="model"
            name="model"
            defaultValue={vehicle.model ?? ""}
            className="w-full rounded-lg border border-steel/30 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor="currentOdometer" className="mb-1 block text-xs font-medium text-steel">
          Current odometer (KM)
        </label>
        <input
          id="currentOdometer"
          name="currentOdometer"
          inputMode="numeric"
          defaultValue={vehicle.current_odometer}
          className="w-full rounded-lg border border-steel/30 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-steel">
          Normally updated automatically when a driver finishes a trip — only change this manually to correct it.
        </p>
      </div>

      <VehicleComplianceFields vehicle={vehicle} />

      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="active" defaultChecked={vehicle.active} className="h-4 w-4" />
        Vehicle is active
      </label>

      {state.error && (
        <p role="alert" className="text-sm font-medium text-rust">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}

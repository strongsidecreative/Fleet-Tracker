"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { updateVehicle } from "../actions";

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
          }}
          className="w-full text-xs text-steel file:mr-3 file:rounded-lg file:border-0 file:bg-ink file:px-3 file:py-2 file:text-xs file:font-semibold file:text-paper"
        />
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

      <div className="border-t border-steel/10 pt-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-steel">Compliance</p>
        <div className="space-y-3">
          <div>
            <label htmlFor="wofDue" className="mb-1 block text-xs font-medium text-steel">
              WOF expiry date
            </label>
            <input
              id="wofDue"
              name="wofDue"
              type="date"
              defaultValue={vehicle.wof_due ?? ""}
              className="w-full rounded-lg border border-steel/30 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="regoDue" className="mb-1 block text-xs font-medium text-steel">
              Registration expiry date
            </label>
            <input
              id="regoDue"
              name="regoDue"
              type="date"
              defaultValue={vehicle.rego_due ?? ""}
              className="w-full rounded-lg border border-steel/30 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="ruc" className="mb-1 block text-xs font-medium text-steel">
              RUC purchased-to (KM) <span className="font-normal">— optional</span>
            </label>
            <input
              id="ruc"
              name="ruc"
              inputMode="numeric"
              defaultValue={vehicle.ruc_purchased_to_km ?? ""}
              placeholder="e.g. 90000"
              className="w-full rounded-lg border border-steel/30 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-steel/10 pt-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-steel">
          Servicing — set a KM figure, a date, or both. Whichever comes first counts.
        </p>
        <div className="space-y-3">
          <div>
            <label htmlFor="serviceDueKm" className="mb-1 block text-xs font-medium text-steel">
              Next service due (KM)
            </label>
            <input
              id="serviceDueKm"
              name="serviceDueKm"
              inputMode="numeric"
              defaultValue={vehicle.service_due_km ?? ""}
              className="w-full rounded-lg border border-steel/30 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="serviceDueDate" className="mb-1 block text-xs font-medium text-steel">
              Next service due (date)
            </label>
            <input
              id="serviceDueDate"
              name="serviceDueDate"
              type="date"
              defaultValue={vehicle.service_due_date ?? ""}
              className="w-full rounded-lg border border-steel/30 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="lastServiceDate" className="mb-1 block text-xs font-medium text-steel">
                Last service date
              </label>
              <input
                id="lastServiceDate"
                name="lastServiceDate"
                type="date"
                defaultValue={vehicle.last_service_date ?? ""}
                className="w-full rounded-lg border border-steel/30 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="lastServiceOdometer" className="mb-1 block text-xs font-medium text-steel">
                Last service KM
              </label>
              <input
                id="lastServiceOdometer"
                name="lastServiceOdometer"
                inputMode="numeric"
                defaultValue={vehicle.last_service_odometer ?? ""}
                className="w-full rounded-lg border border-steel/30 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

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

"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { logFuel } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-ink py-3 text-base font-semibold text-paper disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save Fuel Log"}
    </button>
  );
}

export default function FuelLogForm({
  vehicles,
  defaultVehicleId,
}: {
  vehicles: { id: string; name: string; registration: string; current_odometer: number }[];
  defaultVehicleId?: string;
}) {
  const [state, formAction] = useFormState(logFuel, { error: null });
  const [vehicleId, setVehicleId] = useState(defaultVehicleId ?? "");
  const [receiptName, setReceiptName] = useState<string | null>(null);

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-steel/20 bg-white p-4">
      <div>
        <label htmlFor="vehicleId" className="mb-1 block text-sm font-medium text-ink">
          Vehicle
        </label>
        <select
          id="vehicleId"
          name="vehicleId"
          required
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
          className="w-full rounded-lg border border-steel/30 px-4 py-3 text-base focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="">Select a vehicle</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} ({v.registration})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="odometerKm" className="mb-1 block text-sm font-medium text-ink">
          Current KM (from the dash)
        </label>
        <input
          id="odometerKm"
          name="odometerKm"
          inputMode="numeric"
          placeholder={selectedVehicle ? `e.g. ${selectedVehicle.current_odometer}` : "e.g. 48210"}
          required
          className="w-full rounded-lg border border-steel/30 px-4 py-3 text-lg focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="litres" className="mb-1 block text-sm font-medium text-ink">
            Litres
          </label>
          <input
            id="litres"
            name="litres"
            inputMode="decimal"
            placeholder="e.g. 42.50"
            required
            className="w-full rounded-lg border border-steel/30 px-4 py-3 text-lg focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <div>
          <label htmlFor="cost" className="mb-1 block text-sm font-medium text-ink">
            Total Paid ($)
          </label>
          <input
            id="cost"
            name="cost"
            inputMode="decimal"
            placeholder="e.g. 105.30"
            required
            className="w-full rounded-lg border border-steel/30 px-4 py-3 text-lg focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 flex items-center gap-2 text-sm font-medium text-ink">
          <span className="rounded bg-ink px-2 py-1 text-xs text-paper">Add Receipt Photo</span>
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

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium text-ink">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          placeholder="e.g. Z Fenton St, paid on fleet card"
          className="w-full rounded-lg border border-steel/30 px-4 py-3 text-base focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
        />
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

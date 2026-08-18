"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { submitIncident } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-rust py-3 text-base font-semibold text-paper disabled:opacity-60"
    >
      {pending ? "Submitting…" : "Submit Report"}
    </button>
  );
}

export default function ReportIncidentForm({
  vehicles,
  defaultVehicleId,
}: {
  vehicles: { id: string; name: string; registration: string }[];
  defaultVehicleId?: string;
}) {
  const [state, formAction] = useFormState(submitIncident, { error: null });
  const [severity, setSeverity] = useState("low");

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-steel/20 bg-white p-4">
      <input type="hidden" name="reportType" value="incident" />

      <div>
        <label htmlFor="vehicleId" className="mb-1 block text-sm font-medium text-ink">
          Vehicle
        </label>
        <select
          id="vehicleId"
          name="vehicleId"
          required
          defaultValue={defaultVehicleId ?? ""}
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
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-ink">
          What happened?
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          required
          placeholder="Describe the incident or damage"
          className="w-full rounded-lg border border-steel/30 px-4 py-3 text-base focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      <div>
        <p className="mb-1 text-sm font-medium text-ink">Severity</p>
        <input type="hidden" name="severity" value={severity} />
        <div className="flex gap-2">
          {["low", "medium", "high"].map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => setSeverity(s)}
              className={`flex-1 rounded-lg border py-2 text-sm font-medium capitalize ${
                severity === s ? "border-ink bg-ink text-paper" : "border-steel/30 text-ink"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
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

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

function YesNoToggle({
  name,
  value,
  onChange,
}: {
  name: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex gap-2">
      <input type="hidden" name={name} value={value ? "true" : "false"} />
      {[
        { label: "Yes", v: true },
        { label: "No", v: false },
      ].map((opt) => (
        <button
          type="button"
          key={opt.label}
          onClick={() => onChange(opt.v)}
          className={`flex-1 rounded-lg border py-2 text-sm font-medium ${
            value === opt.v ? "border-ink bg-ink text-paper" : "border-steel/30 text-ink"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function todayInNZ() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Pacific/Auckland" });
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
  const [policeInvolved, setPoliceInvolved] = useState(false);
  const [otherVehicleDamage, setOtherVehicleDamage] = useState(false);
  const [witnessInvolved, setWitnessInvolved] = useState(false);

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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="incidentDate" className="mb-1 block text-sm font-medium text-ink">
            Date of incident
          </label>
          <input
            id="incidentDate"
            name="incidentDate"
            type="date"
            required
            defaultValue={todayInNZ()}
            max={todayInNZ()}
            className="w-full rounded-lg border border-steel/30 px-4 py-3 text-base focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <div>
          <label htmlFor="incidentTime" className="mb-1 block text-sm font-medium text-ink">
            Time of incident
          </label>
          <input
            id="incidentTime"
            name="incidentTime"
            type="time"
            className="w-full rounded-lg border border-steel/30 px-4 py-3 text-base focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
      </div>

      <div>
        <label htmlFor="location" className="mb-1 block text-sm font-medium text-ink">
          Location of incident
        </label>
        <input
          id="location"
          name="location"
          type="text"
          placeholder="e.g. corner of Fenton St & Amohia St, Rotorua"
          className="w-full rounded-lg border border-steel/30 px-4 py-3 text-base focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
        />
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
          placeholder="Describe the incident or damage, in your own words"
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

      <div>
        <p className="mb-1 text-sm font-medium text-ink">
          Was there damage to another vehicle or property?
        </p>
        <YesNoToggle name="otherVehicleDamage" value={otherVehicleDamage} onChange={setOtherVehicleDamage} />
        {otherVehicleDamage && (
          <textarea
            name="propertyDamageDetails"
            rows={2}
            placeholder="Describe the damage"
            className="mt-2 w-full rounded-lg border border-steel/30 px-4 py-3 text-base focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
          />
        )}
      </div>

      <div>
        <p className="mb-1 text-sm font-medium text-ink">Were the Police involved?</p>
        <YesNoToggle name="policeInvolved" value={policeInvolved} onChange={setPoliceInvolved} />
        {policeInvolved && (
          <textarea
            name="policeDetails"
            rows={2}
            placeholder="Details of the officer(s) attending, e.g. name, station, reference number"
            className="mt-2 w-full rounded-lg border border-steel/30 px-4 py-3 text-base focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
          />
        )}
      </div>

      <div>
        <p className="mb-1 text-sm font-medium text-ink">
          Did the incident involve any other person or witness?
        </p>
        <YesNoToggle name="witnessInvolved" value={witnessInvolved} onChange={setWitnessInvolved} />
        {witnessInvolved && (
          <textarea
            name="witnessDetails"
            rows={2}
            placeholder="Their name(s) and contact details"
            className="mt-2 w-full rounded-lg border border-steel/30 px-4 py-3 text-base focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
          />
        )}
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

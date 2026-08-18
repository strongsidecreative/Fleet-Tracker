"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { upsertLicence } from "./actions";
import { licenceSeverity, LICENCE_LABEL, LICENCE_BADGE_CLASS } from "@/lib/licenceStatus";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-ink py-3 text-base font-semibold text-paper disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save Licence Details"}
    </button>
  );
}

export default function LicenceSection({ driverId, licence }: { driverId: string; licence: any }) {
  const [editing, setEditing] = useState(false);
  const boundAction = upsertLicence.bind(null, driverId);
  const [state, formAction] = useFormState(boundAction, { error: null });

  if (!editing) {
    if (!licence) {
      return (
        <div className="rounded-xl border border-steel/20 bg-white p-4">
          <p className="mb-3 text-sm text-steel">Licence details not recorded</p>
          <button onClick={() => setEditing(true)} className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper">
            Add Licence Details
          </button>
        </div>
      );
    }

    const severity = licenceSeverity(licence.expiry_date);

    return (
      <div className="rounded-xl border border-steel/20 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${LICENCE_BADGE_CLASS[severity]}`}>
            {LICENCE_LABEL[severity].toUpperCase()}
          </span>
          <span className="text-xs text-steel">
            Last updated {new Date(licence.updated_at).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland" })}
          </span>
        </div>
        <div className="space-y-2 text-sm">
          <div>
            <p className="text-xs text-steel">Licence Number</p>
            <p className="font-medium text-ink">{licence.licence_number}</p>
          </div>
          <div>
            <p className="text-xs text-steel">Version Number</p>
            <p className="font-medium text-ink">{licence.version_number || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-steel">Licence Class</p>
            <p className="font-medium text-ink">{licence.licence_class || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-steel">Expiry Date</p>
            <p className="font-medium text-ink">
              {new Date(licence.expiry_date).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="mt-4 w-full rounded-lg border border-steel/30 py-2 text-sm font-semibold text-ink"
        >
          Edit Licence Details
        </button>
      </div>
    );
  }

  return (
    <form
      action={async (formData) => {
        await formAction(formData);
        setEditing(false);
      }}
      className="space-y-4 rounded-xl border border-steel/20 bg-white p-4"
    >
      <div>
        <label htmlFor="licenceNumber" className="mb-1 block text-xs font-medium text-steel">
          Licence Number
        </label>
        <input
          id="licenceNumber"
          name="licenceNumber"
          required
          defaultValue={licence?.licence_number ?? ""}
          className="w-full rounded-lg border border-steel/30 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="versionNumber" className="mb-1 block text-xs font-medium text-steel">
          Version Number
        </label>
        <input
          id="versionNumber"
          name="versionNumber"
          defaultValue={licence?.version_number ?? ""}
          className="w-full rounded-lg border border-steel/30 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="licenceClass" className="mb-1 block text-xs font-medium text-steel">
          Licence Class
        </label>
        <input
          id="licenceClass"
          name="licenceClass"
          placeholder="e.g. Class 1"
          defaultValue={licence?.licence_class ?? ""}
          className="w-full rounded-lg border border-steel/30 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="expiryDate" className="mb-1 block text-xs font-medium text-steel">
          Expiry Date
        </label>
        <input
          id="expiryDate"
          name="expiryDate"
          type="date"
          required
          defaultValue={licence?.expiry_date ?? ""}
          className="w-full rounded-lg border border-steel/30 px-3 py-2 text-sm"
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm font-medium text-rust">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="flex-1 rounded-xl border border-steel/30 py-3 text-sm font-semibold text-ink"
        >
          Cancel
        </button>
        <div className="flex-1">
          <SubmitButton />
        </div>
      </div>
    </form>
  );
}

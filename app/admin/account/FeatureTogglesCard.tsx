"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateOrgFeatures } from "./actions";
import { FEATURE_LABELS, FEATURE_DESCRIPTIONS, type FeatureKey } from "@/lib/orgFeatures";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

export default function FeatureTogglesCard({ features }: { features: Record<FeatureKey, boolean> }) {
  const [state, formAction] = useFormState(updateOrgFeatures, { error: null });

  return (
    <div className="max-w-sm space-y-3 rounded-xl border border-steel/20 bg-white p-4">
      <p className="text-xs text-steel">Features</p>
      <form action={formAction} className="space-y-3">
        {(Object.keys(FEATURE_LABELS) as FeatureKey[]).map((key) => (
          <label key={key} className="flex items-start gap-2 text-sm text-ink">
            <input
              type="checkbox"
              name={key}
              defaultChecked={features[key]}
              className="mt-0.5 h-4 w-4 flex-shrink-0"
            />
            <span>
              <span className="block font-medium">{FEATURE_LABELS[key]}</span>
              <span className="block text-xs text-steel">{FEATURE_DESCRIPTIONS[key]}</span>
            </span>
          </label>
        ))}
        <SaveButton />
      </form>
      {state.error && (
        <p role="alert" className="text-sm font-medium text-rust">
          {state.error}
        </p>
      )}
      <p className="text-xs text-steel">
        Turning a feature off removes it from menus and blocks the page directly, for everyone in this
        organisation only — other organisations on Fleet Tracker are unaffected.
      </p>
    </div>
  );
}

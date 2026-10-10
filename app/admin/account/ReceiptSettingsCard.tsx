"use client";

import { useFormState, useFormStatus } from "react-dom";
import { saveReceiptSettings } from "../fuel/receipts/actions";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper disabled:opacity-60">
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

const RETENTION_OPTIONS = [
  { value: 1, label: "1 month after saving" },
  { value: 3, label: "3 months after saving" },
  { value: 6, label: "6 months after saving" },
  { value: 12, label: "12 months after saving" },
  { value: 0, label: "Never (keep all photos)" },
];

export default function ReceiptSettingsCard({
  delivery,
  retention,
  emailAvailable,
}: {
  delivery: "remind" | "email";
  retention: number;
  emailAvailable: boolean;
}) {
  const [state, formAction] = useFormState(saveReceiptSettings, { error: null });

  return (
    <div className="max-w-sm space-y-3 rounded-xl border border-steel/20 bg-white p-4">
      <p className="text-xs text-steel">Monthly fuel receipts</p>
      <form action={formAction} className="space-y-3">
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium text-ink">At the start of each month</legend>
          <label className="flex items-start gap-2 text-sm text-ink">
            <input type="radio" name="delivery" value="remind" defaultChecked={delivery !== "email"} className="mt-0.5 h-4 w-4" />
            <span>
              <span className="block font-medium">Remind admins to download them</span>
              <span className="block text-xs text-steel">A prompt on the dashboard, a notification{emailAvailable ? ", and an email with a link" : ""}.</span>
            </span>
          </label>
          <label className={`flex items-start gap-2 text-sm ${emailAvailable ? "text-ink" : "text-steel"}`}>
            <input
              type="radio"
              name="delivery"
              value="email"
              defaultChecked={delivery === "email"}
              disabled={!emailAvailable}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              <span className="block font-medium">Email them to all admins automatically</span>
              <span className="block text-xs text-steel">
                {emailAvailable
                  ? "Last month's receipts arrive as a ZIP attachment. Very large months get a download link instead."
                  : "Not available yet: email isn't switched on for Fleet Tracker."}
              </span>
            </span>
          </label>
        </fieldset>

        <label className="block text-sm text-ink">
          <span className="mb-1 block font-medium">Clear photos from Fleet Tracker</span>
          <select name="retention" defaultValue={String(retention)} className="w-full rounded-lg border border-steel/30 px-3 py-2 text-sm">
            {RETENTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-steel">
            Only months that were downloaded or emailed are ever cleared. The fuel log itself is always kept. Keep your
            saved copies: business records generally need to be kept for 7 years.
          </span>
        </label>

        <SaveButton />
      </form>
      {state.error && (
        <p role="alert" className="text-sm font-medium text-rust">
          {state.error}
        </p>
      )}
      {state.saved && !state.error && <p className="text-sm font-medium text-track">Saved.</p>}
    </div>
  );
}

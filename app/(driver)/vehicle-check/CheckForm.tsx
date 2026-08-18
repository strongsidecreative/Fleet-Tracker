"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { submitVehicleCheck } from "./actions";
import { CHECKLIST_ITEMS } from "@/lib/vehicleCheckItems";

type ItemState = { result: "" | "ok" | "issue"; comment: string; photoName: string | null };

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="w-full rounded-xl bg-ink py-3.5 text-base font-semibold text-paper disabled:opacity-40"
    >
      {pending ? "Submitting…" : "Submit Vehicle Check"}
    </button>
  );
}

export default function CheckForm({
  vehicle,
}: {
  vehicle: { id: string; name: string; registration: string; current_odometer: number };
}) {
  const [state, formAction] = useFormState(submitVehicleCheck, { error: null });
  const [checkType, setCheckType] = useState<"" | "pre" | "post">("");
  const [items, setItems] = useState<Record<string, ItemState>>(
    Object.fromEntries(CHECKLIST_ITEMS.map((i) => [i.key, { result: "", comment: "", photoName: null }]))
  );
  const [initials, setInitials] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const completedCount = CHECKLIST_ITEMS.filter((i) => items[i.key].result !== "").length;
  const progress = Math.round((completedCount / CHECKLIST_ITEMS.length) * 100);

  const issueCount = CHECKLIST_ITEMS.filter((i) => items[i.key].result === "issue").length;
  const overallLabel =
    completedCount < CHECKLIST_ITEMS.length
      ? null
      : issueCount === 0
        ? "ALL OK"
        : `${issueCount} ISSUE${issueCount > 1 ? "S" : ""} REPORTED`;

  const allItemsValid = CHECKLIST_ITEMS.every((i) => {
    const it = items[i.key];
    if (it.result === "") return false;
    if (it.result === "issue" && !it.comment.trim()) return false;
    return true;
  });

  const canSubmit = checkType !== "" && allItemsValid && initials.trim().length > 0 && confirmed;

  function updateItem(key: string, patch: Partial<ItemState>) {
    setItems((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  return (
    <form action={formAction} className="space-y-4 pb-24">
      <input type="hidden" name="vehicleId" value={vehicle.id} />
      <input type="hidden" name="checkType" value={checkType} />
      <input type="hidden" name="confirmed" value={confirmed ? "on" : ""} />

      <div className="rounded-xl border border-steel/20 bg-white p-4">
        <p className="font-display text-lg font-bold text-ink">{vehicle.name}</p>
        <p className="text-xs text-steel">{vehicle.registration}</p>
        <p className="mt-2 text-xs text-steel">Current KM (read only)</p>
        <p className="odometer text-xl font-bold text-ink">{vehicle.current_odometer.toLocaleString("en-NZ")} KM</p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-ink">Check Type</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCheckType("pre")}
            className={`flex-1 rounded-xl border py-3 text-sm font-semibold ${
              checkType === "pre" ? "border-ink bg-ink text-paper" : "border-steel/30 text-ink"
            }`}
          >
            Pre-Operation
          </button>
          <button
            type="button"
            onClick={() => setCheckType("post")}
            className={`flex-1 rounded-xl border py-3 text-sm font-semibold ${
              checkType === "post" ? "border-ink bg-ink text-paper" : "border-steel/30 text-ink"
            }`}
          >
            Post-Operation
          </button>
        </div>
      </div>

      <div className="sticky top-0 z-10 -mx-4 bg-paper px-4 py-2">
        <div className="flex items-center justify-between text-xs font-medium text-steel">
          <span>
            {completedCount} of {CHECKLIST_ITEMS.length} completed
          </span>
          <span>{progress}%</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-steel/15">
          <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="space-y-3">
        {CHECKLIST_ITEMS.map((item) => {
          const it = items[item.key];
          return (
            <div key={item.key} className="rounded-xl border border-steel/20 bg-white p-4">
              <p className="mb-2 text-sm font-semibold text-ink">{item.label}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => updateItem(item.key, { result: "ok" })}
                  className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold ${
                    it.result === "ok" ? "border-track bg-track/15 text-track" : "border-steel/30 text-ink"
                  }`}
                >
                  ✓ OK
                </button>
                <button
                  type="button"
                  onClick={() => updateItem(item.key, { result: "issue" })}
                  className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold ${
                    it.result === "issue" ? "border-rust bg-rust/10 text-rust" : "border-steel/30 text-ink"
                  }`}
                >
                  ! Issue
                </button>
              </div>
              <input type="hidden" name={`result_${item.key}`} value={it.result} />

              {it.result === "issue" && (
                <div className="mt-3 space-y-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-steel">Describe the issue *</label>
                    <textarea
                      name={`comment_${item.key}`}
                      value={it.comment}
                      onChange={(e) => updateItem(item.key, { comment: e.target.value })}
                      rows={2}
                      required
                      className="w-full rounded-lg border border-steel/30 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-2 text-xs font-medium text-steel">
                      <span className="rounded bg-ink px-2 py-1 text-paper">Add Photo (optional)</span>
                      {it.photoName && <span className="text-track">{it.photoName}</span>}
                    </label>
                    <input
                      type="file"
                      name={`photo_${item.key}`}
                      accept="image/*"
                      onChange={(e) => updateItem(item.key, { photoName: e.target.files?.[0]?.name ?? null })}
                      className="w-full text-xs text-steel"
                    />
                  </div>
                </div>
              )}
              {it.result === "ok" && (
                <input type="text" name={`comment_${item.key}`} value={it.comment} readOnly hidden />
              )}
            </div>
          );
        })}
      </div>

      {overallLabel && (
        <div
          className={`rounded-xl p-4 text-center font-display text-lg font-bold ${
            issueCount === 0 ? "bg-track/15 text-track" : "bg-rust/10 text-rust"
          }`}
        >
          {overallLabel}
        </div>
      )}

      <div className="rounded-xl border border-steel/20 bg-white p-4">
        <p className="mb-3 text-sm font-bold text-ink">Sign-Off</p>
        <label className="mb-1 block text-xs font-medium text-steel">Initials</label>
        <input
          name="initials"
          value={initials}
          onChange={(e) => setInitials(e.target.value.toUpperCase())}
          placeholder="e.g. TP"
          maxLength={6}
          className="mb-3 w-full rounded-lg border border-steel/30 px-3 py-2 text-sm uppercase"
        />
        <label className="flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          I confirm that I have completed this vehicle check accurately.
        </label>
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg bg-rust/10 p-3 text-sm font-medium text-rust">
          {state.error}
        </p>
      )}

      <div className="fixed bottom-16 left-0 right-0 mx-auto max-w-lg px-4 md:bottom-4">
        <div className="rounded-xl bg-paper/95 p-2 backdrop-blur">
          <SubmitButton disabled={!canSubmit} />
        </div>
      </div>
    </form>
  );
}

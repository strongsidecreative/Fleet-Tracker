"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { startTrip, finishTrip } from "./actions";
import LocationCapture from "@/components/LocationCapture";
import { fmtKm, kmCaution } from "@/lib/kmCheck";

function SubmitButton({ label, waiting, hidden }: { label: string; waiting: boolean; hidden?: boolean }) {
  const { pending } = useFormStatus();
  if (hidden) return null;
  return (
    <button
      type="submit"
      disabled={pending || waiting}
      className="w-full rounded-xl bg-ink py-3 text-base font-semibold text-paper disabled:opacity-60"
    >
      {pending ? "Saving…" : waiting ? "Getting location…" : label}
    </button>
  );
}

type FormState = { error: string | null; confirm?: string | null; confirmKm?: number | null };

/**
 * KM box with a typo guard. While typing it warns about a big jump from
 * the previous reading or a reading below it. If the driver submits a big
 * jump anyway, the server sends it back for a second look, and this shows
 * "Yes, it's right" / "Fix it" before anything is saved.
 */
function KmField({
  label,
  previous,
  kind,
  state,
  km,
  setKm,
}: {
  label: string;
  previous: number;
  kind: "start" | "finish";
  state: FormState;
  km: string;
  setKm: (v: string) => void;
}) {
  const n = Number(km.replace(/[\s,]/g, ""));
  const hasNumber = km.trim() !== "" && Number.isFinite(n);
  const below = hasNumber && n < previous;
  const liveCaution = hasNumber ? kmCaution(n, previous, kind) : null;
  const pendingConfirm = state.confirm && state.confirmKm === n ? state.confirm : null;

  return (
    <div>
      <label htmlFor="km" className="mb-1 block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id="km"
        name="km"
        inputMode="numeric"
        autoComplete="off"
        value={km}
        onChange={(e) => setKm(e.target.value.replace(/[^0-9]/g, ""))}
        placeholder={`e.g. ${previous + (kind === "start" ? 2 : 20)}`}
        required
        className={`w-full rounded-lg border bg-white px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-brand ${
          liveCaution || below ? "border-amber" : "border-steel/30 focus:border-ink"
        }`}
      />
      <p className="mt-1 text-xs text-steel">
        {kind === "start" ? "Last recorded" : "Started at"}: <span className="font-semibold text-ink">{fmtKm(previous)}</span>
        {hasNumber && !below && n >= previous && !liveCaution && (
          <span> · this trip adds {fmtKm(n - previous)}</span>
        )}
      </p>
      {below && (
        <p role="alert" className="mt-1 text-xs font-medium text-rust">
          That&apos;s below {fmtKm(previous)}. Check the reading on the dashboard.
        </p>
      )}
      {liveCaution && !pendingConfirm && (
        <p role="alert" className="mt-1 rounded border-l-4 border-amber bg-amber/10 px-2 py-1 text-xs font-medium text-ink">
          Check this: {liveCaution}
        </p>
      )}
      {pendingConfirm && (
        <div role="alert" className="mt-2 rounded-lg border border-amber bg-amber/10 p-3">
          <p className="text-sm font-semibold text-ink">Is {fmtKm(n)} right?</p>
          <p className="mt-0.5 text-xs text-ink">{pendingConfirm}</p>
          <input type="hidden" name="confirmed" value={n} />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setKm("");
                document.getElementById("km")?.focus();
              }}
              className="rounded-lg border border-ink py-2 text-sm font-semibold text-ink"
            >
              Fix it
            </button>
            <button type="submit" className="rounded-lg bg-ink py-2 text-sm font-semibold text-paper">
              Yes, it&apos;s right
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PlaceField({ kind, onTyped }: { kind: "Start" | "Finish"; onTyped: (typed: boolean) => void }) {
  return (
    <div>
      <label htmlFor="place" className="mb-1 block text-sm font-medium text-ink">
        {kind} Location <span className="font-normal text-steel">(optional)</span>
      </label>
      <input
        id="place"
        name="place"
        type="text"
        autoComplete="off"
        maxLength={120}
        placeholder="e.g. Whakatāne office, 12 King St"
        onChange={(e) => onTyped(e.target.value.trim() !== "")}
        className="w-full rounded-lg border border-steel/30 bg-white px-4 py-3 text-base focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
      />
      <p className="mt-1 text-xs text-steel">Leave blank to use your phone&apos;s location.</p>
    </div>
  );
}

export function StartTripForm({ vehicleId, defaultKm }: { vehicleId: string; defaultKm: number }) {
  const boundAction = startTrip.bind(null, vehicleId);
  const [state, formAction] = useFormState<FormState, FormData>(boundAction, { error: null });
  const [locating, setLocating] = useState(true);
  const [typed, setTyped] = useState(false);
  const [km, setKm] = useState("");
  const confirming = !!state.confirm && state.confirmKm === Number(km);

  return (
    <form action={formAction} className="space-y-4">
      <KmField label="Enter Current KM" previous={defaultKm} kind="start" state={state} km={km} setKm={setKm} />
      <PlaceField kind="Start" onTyped={setTyped} />
      {state.error && (
        <p role="alert" className="text-sm font-medium text-rust">
          {state.error}
        </p>
      )}
      <LocationCapture onSettled={() => setLocating(false)} />
      <SubmitButton label="Start Vehicle Use" waiting={locating && !typed} hidden={confirming} />
    </form>
  );
}

export function FinishTripForm({ tripId, startKm }: { tripId: string; startKm: number }) {
  const boundAction = finishTrip.bind(null, tripId);
  const [state, formAction] = useFormState<FormState, FormData>(boundAction, { error: null });
  const [locating, setLocating] = useState(true);
  const [typed, setTyped] = useState(false);
  const [km, setKm] = useState("");
  const confirming = !!state.confirm && state.confirmKm === Number(km);

  return (
    <form action={formAction} className="space-y-4">
      <KmField label="Current / Ending KM" previous={startKm} kind="finish" state={state} km={km} setKm={setKm} />
      <PlaceField kind="Finish" onTyped={setTyped} />
      {state.error && (
        <p role="alert" className="text-sm font-medium text-rust">
          {state.error}
        </p>
      )}
      <LocationCapture onSettled={() => setLocating(false)} />
      <SubmitButton label="Finish Vehicle Use" waiting={locating && !typed} hidden={confirming} />
    </form>
  );
}

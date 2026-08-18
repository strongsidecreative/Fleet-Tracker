"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useMemo, useState } from "react";
import { createBookingRequest } from "../actions";
import { generateOccurrenceDates, dayLabel, type RecurrencePattern } from "@/lib/bookingRecurrence";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="w-full rounded-xl bg-ink py-3 text-base font-semibold text-paper disabled:opacity-40"
    >
      {pending ? "Submitting…" : "Submit Booking Request"}
    </button>
  );
}

const DAYS = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun for a sane display order

export default function NewBookingForm({
  vehicles,
  admins,
}: {
  vehicles: { id: string; name: string; registration: string }[];
  admins: { id: string; name: string }[];
}) {
  const [state, formAction] = useFormState(createBookingRequest, { error: null });

  const [title, setTitle] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [vehicleRequired, setVehicleRequired] = useState(false);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [approvingAdminId, setApprovingAdminId] = useState(admins.length === 1 ? admins[0].id : "");

  const [isRecurring, setIsRecurring] = useState(false);
  const [mode, setMode] = useState<"weekly" | "monthly">("weekly");
  const [days, setDays] = useState<number[]>([]);
  const [intervalWeeks, setIntervalWeeks] = useState<1 | 2>(1);
  const [endType, setEndType] = useState<"weeks" | "occurrences" | "date">("weeks");
  const [endValue, setEndValue] = useState("4");

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  const occurrenceDates = useMemo(() => {
    if (!isRecurring || !date || !endValue) return [];
    if (mode === "weekly" && days.length === 0) return [];
    const pattern: RecurrencePattern = { mode, days, intervalWeeks, endType, endValue };
    return generateOccurrenceDates(date, pattern);
  }, [isRecurring, mode, date, days, intervalWeeks, endType, endValue]);

  const vehicleName = vehicleRequired ? "To Be Assigned" : vehicles.find((v) => v.id === vehicleId)?.name;
  const adminName = admins.find((a) => a.id === approvingAdminId)?.name;

  const canSubmit =
    title.trim() !== "" &&
    (vehicleId || vehicleRequired) &&
    date &&
    startTime &&
    endTime &&
    approvingAdminId &&
    (!isRecurring || (mode === "monthly" ? occurrenceDates.length > 0 : days.length > 0 && occurrenceDates.length > 0));

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-steel/20 bg-white p-4">
      <input type="hidden" name="isRecurring" value={isRecurring ? "on" : ""} />
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="intervalWeeks" value={intervalWeeks} />
      <input type="hidden" name="endType" value={endType} />
      <input type="hidden" name="endValue" value={endValue} />
      {days.map((d) => (
        <input key={d} type="hidden" name="days" value={d} />
      ))}

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">Purpose</label>
        <input
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Course, Whānau trip"
          required
          className="w-full rounded-lg border border-steel/30 px-4 py-3 text-base focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">Vehicle</label>
        <select
          name="vehicleId"
          value={vehicleId}
          disabled={vehicleRequired}
          onChange={(e) => setVehicleId(e.target.value)}
          className="w-full rounded-lg border border-steel/30 px-4 py-3 text-base disabled:bg-paper focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="">Select a vehicle</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} ({v.registration})
            </option>
          ))}
        </select>
        <label className="mt-2 flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="vehicleRequired"
            checked={vehicleRequired}
            onChange={(e) => {
              setVehicleRequired(e.target.checked);
              if (e.target.checked) setVehicleId("");
            }}
            className="h-4 w-4"
          />
          Any vehicle — let the admin assign one
        </label>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">Date</label>
        <input
          type="date"
          name="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={new Date().toISOString().slice(0, 10)}
          required
          className="w-full rounded-lg border border-steel/30 px-4 py-3 text-base focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Start</label>
          <input
            type="time"
            name="startTime"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            className="w-full rounded-lg border border-steel/30 px-3 py-3 text-base focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">End</label>
          <input
            type="time"
            name="endTime"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
            className="w-full rounded-lg border border-steel/30 px-3 py-3 text-base focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-ink">
        <input
          type="checkbox"
          checked={isRecurring}
          onChange={(e) => setIsRecurring(e.target.checked)}
          className="h-4 w-4"
        />
        This is a recurring booking
      </label>

      {isRecurring && (
        <div className="space-y-3 rounded-lg bg-paper p-3">
          <div>
            <p className="mb-1 text-xs font-medium text-steel">Repeat pattern</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("weekly")}
                className={`flex-1 rounded-lg border py-2 text-xs font-semibold ${
                  mode === "weekly" ? "border-ink bg-ink text-paper" : "border-steel/30 text-ink"
                }`}
              >
                Weekly / Fortnightly
              </button>
              <button
                type="button"
                onClick={() => setMode("monthly")}
                className={`flex-1 rounded-lg border py-2 text-xs font-semibold ${
                  mode === "monthly" ? "border-ink bg-ink text-paper" : "border-steel/30 text-ink"
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          {mode === "weekly" && (
            <>
              <div>
                <p className="mb-1 text-xs font-medium text-steel">Repeat on</p>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map((d) => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => toggleDay(d)}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                        days.includes(d) ? "border-brand bg-brand text-paper" : "border-steel/30 text-ink"
                      }`}
                    >
                      {dayLabel(d, true)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs font-medium text-steel">Frequency</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIntervalWeeks(1)}
                    className={`flex-1 rounded-lg border py-2 text-xs font-semibold ${
                      intervalWeeks === 1 ? "border-ink bg-ink text-paper" : "border-steel/30 text-ink"
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    type="button"
                    onClick={() => setIntervalWeeks(2)}
                    className={`flex-1 rounded-lg border py-2 text-xs font-semibold ${
                      intervalWeeks === 2 ? "border-ink bg-ink text-paper" : "border-steel/30 text-ink"
                    }`}
                  >
                    Fortnightly
                  </button>
                </div>
              </div>
            </>
          )}

          {mode === "monthly" && (
            <p className="text-xs text-steel">
              Repeats on the {date ? new Date(`${date}T00:00:00`).getDate() : "—"}
              {date ? ["st", "nd", "rd"][((new Date(`${date}T00:00:00`).getDate() + 90) % 10) - 1] || "th" : ""} of every
              month. Months without that date are skipped.
            </p>
          )}

          <div>
            <p className="mb-1 text-xs font-medium text-steel">Ends</p>
            <div className="flex gap-2">
              <select
                value={endType}
                onChange={(e) => setEndType(e.target.value as any)}
                className="rounded-lg border border-steel/30 px-2 py-2 text-xs"
              >
                {mode === "weekly" && <option value="weeks">After N weeks</option>}
                <option value="occurrences">After N occurrences</option>
                <option value="date">On a date</option>
              </select>
              {endType === "date" ? (
                <input
                  type="date"
                  value={endValue}
                  onChange={(e) => setEndValue(e.target.value)}
                  min={date}
                  className="flex-1 rounded-lg border border-steel/30 px-2 py-2 text-xs"
                />
              ) : (
                <input
                  type="number"
                  min={1}
                  max={26}
                  value={endValue}
                  onChange={(e) => setEndValue(e.target.value)}
                  className="w-20 rounded-lg border border-steel/30 px-2 py-2 text-xs"
                />
              )}
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">Notes (optional)</label>
        <textarea
          name="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-steel/30 px-4 py-3 text-base focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">Approving Admin</label>
        <select
          name="approvingAdminId"
          value={approvingAdminId}
          onChange={(e) => setApprovingAdminId(e.target.value)}
          required
          className="w-full rounded-lg border border-steel/30 px-4 py-3 text-base focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="">Select an admin</option>
          {admins.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      {title && date && startTime && endTime && (vehicleId || vehicleRequired) && (
        <div className="rounded-lg border border-brand/30 bg-brand/5 p-3 text-sm">
          <p className="mb-1 font-bold text-ink">{title}</p>
          <p className="text-steel">Vehicle: {vehicleName || "—"}</p>
          {isRecurring ? (
            <>
              <p className="text-steel">
                {mode === "monthly"
                  ? "Monthly, same date"
                  : days.slice().sort().map((d) => dayLabel(d, true)).join(", ") || "—"}
              </p>
              <p className="text-steel">
                {startTime} – {endTime}
              </p>
              <p className="text-steel">Total occurrences: {occurrenceDates.length}</p>
            </>
          ) : (
            <p className="text-steel">
              {date} · {startTime} – {endTime}
            </p>
          )}
          {adminName && <p className="mt-1 text-steel">Approval requested from: {adminName}</p>}
        </div>
      )}

      {state.error && (
        <p role="alert" className="text-sm font-medium text-rust">
          {state.error}
        </p>
      )}
      <SubmitButton disabled={!canSubmit} />
    </form>
  );
}

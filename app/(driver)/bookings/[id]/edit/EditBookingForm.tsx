"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { editBooking } from "../../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-ink py-3 text-base font-semibold text-paper disabled:opacity-50"
    >
      {pending ? "Saving…" : "Save Changes"}
    </button>
  );
}

export default function EditBookingForm({ booking, vehicles }: { booking: any; vehicles: { id: string; name: string; registration: string }[] }) {
  const boundAction = editBooking.bind(null, booking.id);
  const [state, formAction] = useFormState(boundAction, { error: null });

  const start = new Date(booking.start_datetime);
  const end = new Date(booking.end_datetime);
  const toDateInput = (d: Date) => d.toISOString().slice(0, 10);
  const toTimeInput = (d: Date) => d.toTimeString().slice(0, 5);

  const [vehicleId, setVehicleId] = useState(booking.vehicle_id ?? "");
  const [vehicleRequired, setVehicleRequired] = useState(booking.vehicle_required);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-steel/20 bg-white p-4">
      {booking.approval_status === "approved" && (
        <p className="rounded-lg bg-amber/10 p-3 text-xs font-medium text-amber">
          This booking is already approved. Changing the vehicle, date, or time will send it back for
          re-approval by {booking.approving_admin_id ? "the same admin" : "an admin"}.
        </p>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">Purpose</label>
        <input
          name="title"
          defaultValue={booking.title}
          required
          className="w-full rounded-lg border border-steel/30 px-4 py-3 text-base"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">Vehicle</label>
        <select
          name="vehicleId"
          value={vehicleId}
          disabled={vehicleRequired}
          onChange={(e) => setVehicleId(e.target.value)}
          className="w-full rounded-lg border border-steel/30 px-4 py-3 text-base disabled:bg-paper"
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
        <input type="date" name="date" defaultValue={toDateInput(start)} required className="w-full rounded-lg border border-steel/30 px-4 py-3 text-base" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Start</label>
          <input type="time" name="startTime" defaultValue={toTimeInput(start)} required className="w-full rounded-lg border border-steel/30 px-3 py-3 text-base" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">End</label>
          <input type="time" name="endTime" defaultValue={toTimeInput(end)} required className="w-full rounded-lg border border-steel/30 px-3 py-3 text-base" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">Notes (optional)</label>
        <textarea name="notes" defaultValue={booking.notes ?? ""} rows={2} className="w-full rounded-lg border border-steel/30 px-4 py-3 text-base" />
      </div>

      {state.error && <p className="text-sm font-medium text-rust">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}

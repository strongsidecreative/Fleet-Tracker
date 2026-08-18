"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { approveBooking, declineBooking } from "../actions";

function Btn({ label, className }: { label: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-50`}>
      {pending ? "Working…" : label}
    </button>
  );
}

export default function ApprovalActions({
  bookingId,
  needsVehicle,
  vehicles,
}: {
  bookingId: string;
  needsVehicle: boolean;
  vehicles: { id: string; name: string }[];
}) {
  const boundApprove = approveBooking.bind(null, bookingId);
  const boundDecline = declineBooking.bind(null, bookingId);
  const [approveState, approveAction] = useFormState(boundApprove, { error: null });
  const [declineState, declineAction] = useFormState(boundDecline, { error: null });
  const [note, setNote] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [showDecline, setShowDecline] = useState(false);

  return (
    <div className="space-y-3">
      {needsVehicle && (
        <div>
          <label className="mb-1 block text-xs font-medium text-steel">Assign a vehicle</label>
          <select
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            className="w-full rounded-lg border border-steel/30 px-3 py-2 text-sm"
          >
            <option value="">Select a vehicle</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {approveState.conflicts && approveState.conflicts.length > 0 && (
        <div className="rounded-lg border border-rust/30 bg-rust/5 p-3">
          <p className="mb-2 text-sm font-bold text-rust">{approveState.conflicts.length} conflict(s) found</p>
          {approveState.conflicts.map((c, i) => (
            <p key={i} className="text-xs text-rust">
              {c.date} — {c.vehicleName} already booked {c.existingTime} by {c.existingDriver} (requested {c.requestedTime})
            </p>
          ))}
          <p className="mt-2 text-xs text-steel">
            Decline this request, or ask the driver to resubmit for a different time or vehicle.
          </p>
        </div>
      )}
      {approveState.error && <p className="text-sm font-medium text-rust">{approveState.error}</p>}
      {declineState.error && <p className="text-sm font-medium text-rust">{declineState.error}</p>}

      <div>
        <label className="mb-1 block text-xs font-medium text-steel">Note (optional for approve, shown to driver if declining)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-steel/30 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex gap-2">
        <form action={approveAction} className="flex-1">
          <input type="hidden" name="note" value={note} />
          <input type="hidden" name="vehicleId" value={vehicleId} />
          <Btn label="Approve Booking" className="w-full rounded-xl bg-track py-3 text-sm font-semibold text-paper" />
        </form>
        <form action={declineAction} className="flex-1">
          <input type="hidden" name="note" value={note} />
          <Btn label="Decline Booking" className="w-full rounded-xl bg-rust py-3 text-sm font-semibold text-paper" />
        </form>
      </div>
    </div>
  );
}

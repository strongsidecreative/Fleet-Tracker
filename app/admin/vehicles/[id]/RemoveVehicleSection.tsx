"use client";

import { useState } from "react";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import { archiveVehicleFromAdmin, deleteVehicleAndRecordsFromAdmin } from "../actions";

/**
 * Collapsed to a single "Remove Vehicle" link by default so it doesn't
 * compete visually with Save above — expands in place to the real
 * choice an admin needs to make: keep this vehicle's trip/booking/check/
 * fuel history (just take it out of the active fleet), or delete
 * everything tied to it for good.
 */
export default function RemoveVehicleSection({ vehicleId, vehicleName }: { vehicleId: string; vehicleName: string }) {
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <div className="border-t border-steel/10 pt-4">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-sm font-medium text-rust underline"
        >
          Remove Vehicle
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-rust/30 bg-rust/5 p-4">
      <div>
        <p className="text-sm font-semibold text-ink">Remove {vehicleName}</p>
        <p className="mt-1 text-xs text-steel">Choose whether to keep its history or delete everything.</p>
      </div>

      <form action={archiveVehicleFromAdmin.bind(null, vehicleId)}>
        <ConfirmSubmitButton
          confirmMessage={`Remove ${vehicleName} from the fleet? Its trip, booking, check and fuel history stays — you can bring it back any time from the "Vehicle is active" checkbox above.`}
          className="w-full rounded-lg border border-steel/30 bg-white py-2 text-sm font-semibold text-ink"
        >
          Keep records, remove from fleet
        </ConfirmSubmitButton>
      </form>

      <form action={deleteVehicleAndRecordsFromAdmin.bind(null, vehicleId)}>
        <ConfirmSubmitButton
          confirmMessage={`Delete ${vehicleName} and ALL its records? This can't be undone — every trip, booking, check and fuel log for this vehicle is gone for good.`}
          className="w-full rounded-lg bg-rust py-2 text-sm font-semibold text-paper"
        >
          Delete vehicle and all records
        </ConfirmSubmitButton>
      </form>

      <button type="button" onClick={() => setExpanded(false)} className="text-xs font-medium text-steel underline">
        Cancel
      </button>
    </div>
  );
}

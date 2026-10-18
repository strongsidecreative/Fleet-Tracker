/**
 * Compliance (WOF, rego, RUC) and Servicing (service + wheel alignment)
 * inputs, shared by the Add Vehicle and Edit Vehicle forms so both capture
 * exactly the same details. Field names match what createVehicle and
 * updateVehicle in ../actions.ts read.
 */

type VehicleDefaults = {
  wof_due?: string | null;
  rego_due?: string | null;
  ruc_purchased_to_km?: number | null;
  service_due_km?: number | null;
  service_due_date?: string | null;
  wheel_alignment_due_km?: number | null;
  wheel_alignment_due_date?: string | null;
};

const inputClass = "w-full rounded-lg border border-steel/30 px-3 py-2 text-sm";
const labelClass = "mb-1 block text-xs font-medium text-steel";

function Field({
  id,
  label,
  type,
  defaultValue,
  placeholder,
}: {
  id: string;
  label: React.ReactNode;
  type: "date" | "km";
  defaultValue?: string | number | null;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type === "date" ? "date" : "text"}
        inputMode={type === "km" ? "numeric" : undefined}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

export default function VehicleComplianceFields({ vehicle = {} }: { vehicle?: VehicleDefaults }) {
  return (
    <>
      <div className="border-t border-steel/10 pt-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-steel">Compliance</p>
        <div className="space-y-3">
          <Field id="wofDue" label="WOF expiry date" type="date" defaultValue={vehicle.wof_due} />
          <Field id="regoDue" label="Registration expiry date" type="date" defaultValue={vehicle.rego_due} />
          <div>
            <Field
              id="ruc"
              label={
                <>
                  RUC purchased-to (KM) <span className="font-normal">(optional)</span>
                </>
              }
              type="km"
              defaultValue={vehicle.ruc_purchased_to_km}
              placeholder="e.g. 90000"
            />
            <p className="mt-1 text-xs text-steel">
              Road User Charges: the odometer reading your current RUC licence is paid up to.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-steel/10 pt-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-steel">Servicing</p>
        <p className="-mt-2 mb-3 text-xs text-steel">
          Set a KM figure, a date, or both. Whichever comes first counts.
        </p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field id="serviceDueKm" label="Next service due (KM)" type="km" defaultValue={vehicle.service_due_km} />
            <Field id="serviceDueDate" label="Next service due (date)" type="date" defaultValue={vehicle.service_due_date} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              id="wheelAlignmentDueKm"
              label="Next wheel alignment (KM)"
              type="km"
              defaultValue={vehicle.wheel_alignment_due_km}
            />
            <Field
              id="wheelAlignmentDueDate"
              label="Next wheel alignment (date)"
              type="date"
              defaultValue={vehicle.wheel_alignment_due_date}
            />
          </div>
        </div>
      </div>
    </>
  );
}

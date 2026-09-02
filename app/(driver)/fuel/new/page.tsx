import { createClient } from "@/lib/supabase/server";
import FuelLogForm from "./FuelLogForm";

export default async function NewFuelLogPage({ searchParams }: { searchParams: { vehicleId?: string } }) {
  const supabase = createClient();
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, name, registration, current_odometer")
    .eq("active", true)
    .order("name");

  return (
    <div>
      <h1 className="mb-1 font-display text-xl font-bold text-ink">Log Fuel</h1>
      <p className="mb-4 text-sm text-steel">Add the pump reading and a photo of the receipt if you have one.</p>
      <FuelLogForm vehicles={vehicles ?? []} defaultVehicleId={searchParams.vehicleId} />
    </div>
  );
}

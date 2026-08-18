import { createClient } from "@/lib/supabase/server";
import ReportIncidentForm from "./ReportIncidentForm";

export default async function ReportIncidentPage({ searchParams }: { searchParams: { vehicleId?: string } }) {
  const supabase = createClient();
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, name, registration")
    .eq("active", true)
    .order("name");

  return (
    <div>
      <h1 className="mb-1 font-display text-xl font-bold text-ink">Report an Incident</h1>
      <p className="mb-4 text-sm text-steel">This goes straight to the admin as a notification.</p>
      <ReportIncidentForm vehicles={vehicles ?? []} defaultVehicleId={searchParams.vehicleId} />
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import VehicleCheckDetail from "@/components/VehicleCheckDetail";

export default async function AdminVehicleCheckDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: check } = await supabase
    .from("vehicle_checks")
    .select("*, vehicle:vehicles(name, registration), driver:profiles(name)")
    .eq("id", params.id)
    .single();

  if (!check) {
    return <p className="text-sm text-steel">Check not found.</p>;
  }

  const { data: items } = await supabase
    .from("vehicle_check_items")
    .select("*")
    .eq("check_id", params.id)
    .order("created_at");

  const itemIds = (items ?? []).map((it) => it.id);
  const { data: existingIncidents } = itemIds.length
    ? await supabase.from("incident_reports").select("id, source_vehicle_check_item_id").in("source_vehicle_check_item_id", itemIds)
    : { data: [] as { id: string; source_vehicle_check_item_id: string }[] };

  const incidentByItemId: Record<string, string> = {};
  for (const inc of existingIncidents ?? []) {
    if (inc.source_vehicle_check_item_id) incidentByItemId[inc.source_vehicle_check_item_id] = inc.id;
  }

  return (
    <div>
      <h1 className="mb-4 font-display text-xl font-bold text-ink">Vehicle Check</h1>
      <VehicleCheckDetail check={check} items={items ?? []} checkId={params.id} incidentByItemId={incidentByItemId} />
    </div>
  );
}

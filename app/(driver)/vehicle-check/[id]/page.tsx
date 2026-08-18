import { createClient } from "@/lib/supabase/server";
import VehicleCheckDetail from "@/components/VehicleCheckDetail";
import SuccessBanner from "@/components/SuccessBanner";

export default async function DriverVehicleCheckDetailPage({ params }: { params: { id: string } }) {
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

  return (
    <div>
      <SuccessBanner />
      <h1 className="mb-4 font-display text-xl font-bold text-ink">Vehicle Check</h1>
      <VehicleCheckDetail check={check} items={items ?? []} />
    </div>
  );
}
